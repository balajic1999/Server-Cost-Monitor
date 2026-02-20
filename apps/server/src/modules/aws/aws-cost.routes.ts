import { Router } from "express";
import { AuthedRequest, requireAuth } from "../../middleware/auth.middleware";
import {
    fetchAndStoreCosts,
    getCostRecords,
    getProjectCostSummary,
} from "./aws-cost.service";

export const costRouter = Router();
costRouter.use(requireAuth);

/**
 * POST /api/costs/fetch – manually trigger cost fetch for a cloud account.
 * Body: { cloudAccountId, startDate, endDate }
 */
costRouter.post("/fetch", async (req: AuthedRequest, res) => {
    const { cloudAccountId, startDate, endDate } = req.body;

    if (!cloudAccountId || !startDate || !endDate) {
        return res.status(400).json({
            message: "cloudAccountId, startDate, and endDate are required",
        });
    }

    try {
        const result = await fetchAndStoreCosts(cloudAccountId, startDate, endDate);
        return res.json(result);
    } catch (error) {
        return res.status(500).json({ message: (error as Error).message });
    }
});

/**
 * GET /api/costs?cloudAccountId=xxx&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * Retrieve stored cost records.
 */
costRouter.get("/", async (req: AuthedRequest, res) => {
    const { cloudAccountId, startDate, endDate } = req.query as Record<string, string>;

    if (!cloudAccountId) {
        return res.status(400).json({ message: "cloudAccountId is required" });
    }

    try {
        const records = await getCostRecords(cloudAccountId, startDate, endDate);
        return res.json(records);
    } catch (error) {
        return res.status(500).json({ message: (error as Error).message });
    }
});

/**
 * GET /api/costs/summary/:projectId – aggregated cost summary for a project.
 */
costRouter.get("/summary/:projectId", async (req: AuthedRequest, res) => {
    try {
        const summary = await getProjectCostSummary(req.params.projectId);
        return res.json(summary);
    } catch (error) {
        return res.status(500).json({ message: (error as Error).message });
    }
});
