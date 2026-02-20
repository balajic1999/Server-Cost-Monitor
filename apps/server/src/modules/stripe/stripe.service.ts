import Stripe from "stripe";
import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";

function getStripe(): Stripe {
    if (!env.STRIPE_SECRET_KEY) {
        throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    return new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2024-10-28.acacia" });
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
                    sub.status === "canceled" ? "CANCELLED" : "ACTIVE";

            await prisma.subscription.update({
                where: { id: dbSub.id },
                data: {
                    status,
                    currentPeriodStart: new Date(sub.current_period_start * 1000),
                    currentPeriodEnd: new Date(sub.current_period_end * 1000),
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
                    status: "CANCELLED",
                    stripeSubscriptionId: null,
                },
            });
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
