import { Router } from "express";
import { requireAuth, AuthedRequest } from "../../middleware/auth.middleware";
import { sanitizeError } from "../../lib/error-utils";
import { getActivity } from "./activity.service";

export const activityRouter = Router();

activityRouter.get("/", requireAuth, async (req: AuthedRequest, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
        const logs = await getActivity(req.user!.sub, limit);
        res.json(logs);
    } catch (err) {
        const { message, status } = sanitizeError(err, 500);
        res.status(status).json({ message });
    }
});
