import Stripe from "stripe";
import { prisma } from "../../lib/prisma";
import { invalidatePlanLimitsCache } from "../../middleware/plan.middleware";
import { env } from "../../config/env";

// Pinned API version. Must be in the literal union exposed by the installed
// Stripe SDK (see node_modules/stripe/types/lib.d.ts → LatestApiVersion).
// Bump in lockstep with the SDK; outbound responses come back in this shape.
const STRIPE_API_VERSION = "2026-01-28.clover" as const;

function getStripe(): Stripe {
    if (!env.STRIPE_SECRET_KEY) {
        throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    return new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: STRIPE_API_VERSION });
}

/**
 * Read the current billing period from a Stripe Subscription. In API versions
 * ≥ 2025-08-27.basil these fields live on subscription items, not the
 * subscription itself. Older webhook payloads still carry them at the top
 * level, so we fall back to either source.
 */
function readSubscriptionPeriod(sub: Stripe.Subscription): { start: Date | null; end: Date | null } {
    const legacy = sub as Stripe.Subscription & {
        current_period_start?: number;
        current_period_end?: number;
    };
    const item = sub.items?.data?.[0];
    const startSec = item?.current_period_start ?? legacy.current_period_start;
    const endSec = item?.current_period_end ?? legacy.current_period_end;
    return {
        start: typeof startSec === "number" ? new Date(startSec * 1000) : null,
        end: typeof endSec === "number" ? new Date(endSec * 1000) : null,
    };
}

/**
 * Create a Stripe Checkout Session for upgrading to Pro.
 */
export async function createCheckoutSession(userId: string, userEmail: string) {
    const stripe = getStripe();

    // Find or create Stripe customer
    let subscription = await prisma.subscription.findUnique({ where: { userId } });

    let customerId: string;

    if (subscription?.stripeCustomerId) {
        customerId = subscription.stripeCustomerId;
    } else {
        const customer = await stripe.customers.create({
            email: userEmail,
            metadata: { userId },
        });
        customerId = customer.id;

        // Create subscription record with FREE plan
        if (!subscription) {
            subscription = await prisma.subscription.create({
                data: {
                    userId,
                    stripeCustomerId: customerId,
                    plan: "FREE",
                    status: "ACTIVE",
                },
            });
        } else {
            await prisma.subscription.update({
                where: { userId },
                data: { stripeCustomerId: customerId },
            });
        }
    }

    if (!env.STRIPE_PRO_PRICE_ID) {
        throw new Error("STRIPE_PRO_PRICE_ID is not configured");
    }

    const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [{ price: env.STRIPE_PRO_PRICE_ID, quantity: 1 }],
        success_url: `${env.FRONTEND_URL}/dashboard/billing?success=true`,
        cancel_url: `${env.FRONTEND_URL}/dashboard/billing?canceled=true`,
        metadata: { userId },
    });

    return { url: session.url };
}

/**
 * Create a Stripe Customer Portal session for managing subscriptions.
 */
export async function createPortalSession(userId: string) {
    const stripe = getStripe();

    const subscription = await prisma.subscription.findUnique({ where: { userId } });
    if (!subscription?.stripeCustomerId) {
        throw new Error("No Stripe customer found. Please subscribe first.");
    }

    const session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripeCustomerId,
        return_url: `${env.FRONTEND_URL}/dashboard/billing`,
    });

    return { url: session.url };
}

/**
 * Handle Stripe webhook events.
 */
export async function handleWebhookEvent(event: Stripe.Event) {
    switch (event.type) {
        case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            const userId = session.metadata?.userId;
            if (!userId) break;

            await prisma.subscription.upsert({
                where: { userId },
                update: {
                    stripeSubscriptionId: session.subscription as string,
                    plan: "PRO",
                    status: "ACTIVE",
                },
                create: {
                    userId,
                    stripeCustomerId: session.customer as string,
                    stripeSubscriptionId: session.subscription as string,
                    plan: "PRO",
                    status: "ACTIVE",
                },
            });
            await invalidatePlanLimitsCache(userId);
            break;
        }

        case "customer.subscription.updated": {
            const sub = event.data.object as Stripe.Subscription;
            const dbSub = await prisma.subscription.findFirst({
                where: { stripeSubscriptionId: sub.id },
            });
            if (!dbSub) break;

            const status = sub.status === "active" ? "ACTIVE" :
                sub.status === "past_due" ? "PAST_DUE" :
                    sub.status === "canceled" ? "CANCELED" : "ACTIVE";

            const period = readSubscriptionPeriod(sub);
            await prisma.subscription.update({
                where: { id: dbSub.id },
                data: {
                    status,
                    currentPeriodStart: period.start,
                    currentPeriodEnd: period.end,
                },
            });
            break;
        }

        case "customer.subscription.deleted": {
            const sub = event.data.object as Stripe.Subscription;
            const dbSub = await prisma.subscription.findFirst({
                where: { stripeSubscriptionId: sub.id },
            });
            if (!dbSub) break;

            await prisma.subscription.update({
                where: { id: dbSub.id },
                data: {
                    plan: "FREE",
                    status: "CANCELED",
                    stripeSubscriptionId: null,
                },
            });
            await invalidatePlanLimitsCache(dbSub.userId);
            break;
        }

        case "invoice.payment_failed": {
            const invoice = event.data.object as Stripe.Invoice;
            const customerId = invoice.customer as string;
            const dbSub = await prisma.subscription.findFirst({
                where: { stripeCustomerId: customerId },
            });
            if (!dbSub) break;

            await prisma.subscription.update({
                where: { id: dbSub.id },
                data: { status: "PAST_DUE" },
            });
            break;
        }
    }
}

/**
 * Get user's current subscription details.
 */
export async function getSubscription(userId: string) {
    const subscription = await prisma.subscription.findUnique({ where: { userId } });

    return {
        plan: subscription?.plan ?? "FREE",
        status: subscription?.status ?? "ACTIVE",
        currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
        hasStripeSubscription: !!subscription?.stripeSubscriptionId,
    };
}
