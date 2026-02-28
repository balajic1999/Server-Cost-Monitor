import { Router } from "express";
import { z } from "zod";
import { AuthedRequest, requireAuth } from "../../middleware/auth.middleware";
import { fetchAndStoreCosts, getCostRecords, getProjectCostSummary } from "./aws-cost.service";
import { prisma } from "../../lib/prisma";

export const costRouter = Router();
costRouter.use(requireAuth);

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

const fetchCostsSchema = z.object({
    cloudAccountId: z.string().min(1, "cloudAccountId is required"),
    startDate: isoDate,
    endDate: isoDate,
}).refine((d) => d.startDate <= d.endDate, {
    message: "startDate must be before or equal to endDate",
});

const getCostsQuerySchema = z.object({
    cloudAccountId: z.string().min(1, "cloudAccountId is required"),
    startDate: isoDate.optional(),
    endDate: isoDate.optional(),
});

/**
 * POST /api/costs/fetch – manually trigger cost fetch for a cloud account.
 */
costRouter.post("/fetch", async (req: AuthedRequest, res) => {
    const parsed = fetchCostsSchema.safeParse(req.body);
    if (!parsed.success) {
        return res
            .status(400)
            .json({ message: "Validation failed", errors: parsed.error.flatten() });
    }

    const account = await prisma.cloudAccount.findFirst({
        where: { id: parsed.data.cloudAccountId, userId: req.user!.sub },
    });
    if (!account) return res.status(404).json({ message: "Cloud account not found" });

    try {
        const result = await fetchAndStoreCosts(
            parsed.data.cloudAccountId,
            parsed.data.startDate,
            parsed.data.endDate
        );
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
    const parsed = getCostsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        return res
            .status(400)
            .json({ message: "Validation failed", errors: parsed.error.flatten() });
    }

    const account = await prisma.cloudAccount.findFirst({
        where: { id: parsed.data.cloudAccountId, userId: req.user!.sub },
    });
    if (!account) return res.status(404).json({ message: "Cloud account not found" });

    try {
        const records = await getCostRecords(
            parsed.data.cloudAccountId,
            parsed.data.startDate,
            parsed.data.endDate
        );
        return res.json(records);
    } catch (error) {
        return res.status(500).json({ message: (error as Error).message });
    }
});

/**
 * GET /api/costs/summary/:projectId – aggregated cost summary for a project.
 */
costRouter.get("/summary/:projectId", async (req: AuthedRequest, res) => {
    const projectId = req.params.projectId;
    if (!projectId || projectId.length < 1) {
        return res.status(400).json({ message: "projectId is required" });
    }

    const project = await prisma.project.findFirst({
        where: { id: projectId, userId: req.user!.sub },
    });
    if (!project) return res.status(404).json({ message: "Project not found" });

    try {
        const summary = await getProjectCostSummary(projectId);
        return res.json(summary);
    } catch (error) {
        return res.status(500).json({ message: (error as Error).message });
    }
});
