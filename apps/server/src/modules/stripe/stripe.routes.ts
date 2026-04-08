import { Router, Request, Response } from "express";
import Stripe from "stripe";
import { AuthedRequest, requireAuth } from "../../middleware/auth.middleware";
import { env } from "../../config/env";
import {
    createCheckoutSession,
    createPortalSession,
    handleWebhookEvent,
    getSubscription,
} from "./stripe.service";

export const stripeRouter = Router();

// POST /api/stripe/checkout – create checkout session (requires auth)
stripeRouter.post("/checkout", requireAuth, async (req: AuthedRequest, res) => {
    try {
        const user = await (await import("../../lib/prisma")).prisma.user.findUnique({
            where: { id: req.user!.sub },
            select: { email: true },
        });
        if (!user) return res.status(404).json({ message: "User not found" });

        const result = await createCheckoutSession(req.user!.sub, user.email);
        return res.json(result);
    } catch (error) {
        return res.status(400).json({ message: (error as Error).message });
    }
});

// POST /api/stripe/portal – create customer portal session (requires auth)
stripeRouter.post("/portal", requireAuth, async (req: AuthedRequest, res) => {
    try {
        const result = await createPortalSession(req.user!.sub);
        return res.json(result);
    } catch (error) {
        return res.status(400).json({ message: (error as Error).message });
    }
});

// GET /api/stripe/subscription – get current subscription (requires auth)
stripeRouter.get("/subscription", requireAuth, async (req: AuthedRequest, res) => {
    try {
        const subscription = await getSubscription(req.user!.sub);
        return res.json(subscription);
    } catch (error) {
        return res.status(500).json({ message: (error as Error).message });
    }
});

// POST /api/stripe/webhook – handle Stripe webhook events (NO auth, raw body)
stripeRouter.post(
    "/webhook",
    // Note: This route needs raw body for Stripe signature verification
    // The raw body middleware is applied in app.ts before JSON parsing
    async (req: Request, res: Response) => {
        if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
            return res.status(400).json({ message: "Stripe is not configured" });
        }

        const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2024-10-28.acacia" });
        const sig = req.headers["stripe-signature"] as string;

        try {
            const event = stripe.webhooks.constructEvent(
                req.body, // Must be raw body
                sig,
                env.STRIPE_WEBHOOK_SECRET
            );

            await handleWebhookEvent(event);
            return res.json({ received: true });
        } catch (error) {
            console.error("[Stripe Webhook] Error:", (error as Error).message);
            return res.status(400).json({ message: (error as Error).message });
        }
    }
);
