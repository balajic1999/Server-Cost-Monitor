import { Router } from "express";
import { AuthedRequest, requireAuth } from "../../middleware/auth.middleware";
import { createAlertRuleSchema, updateAlertRuleSchema } from "./alert.schema";
import {
    createAlertRule,
    listAlertRules,
    updateAlertRule,
    deleteAlertRule,
    getAlertHistory,
} from "./alert.service";

export const alertRouter = Router();
alertRouter.use(requireAuth);

// POST /api/alerts – create alert rule
alertRouter.post("/", async (req: AuthedRequest, res) => {
    const parsed = createAlertRuleSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });
    }

    try {
        const rule = await createAlertRule(req.user!.sub, parsed.data);
        return res.status(201).json(rule);
    } catch (error) {
        return res.status(400).json({ message: (error as Error).message });
    }
});

// GET /api/alerts?projectId=xxx – list alert rules
alertRouter.get("/", async (req: AuthedRequest, res) => {
    const projectId = req.query.projectId as string;
    if (!projectId) {
        return res.status(400).json({ message: "projectId query param required" });
    }

    try {
        const rules = await listAlertRules(req.user!.sub, projectId);
        return res.json(rules);
    } catch {
        return res.status(404).json({ message: "Project not found" });
    }
});

// PATCH /api/alerts/:id – update alert rule
alertRouter.patch("/:id", async (req: AuthedRequest, res) => {
    const parsed = updateAlertRuleSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });
    }

    try {
        const rule = await updateAlertRule(req.user!.sub, req.params.id, parsed.data);
        return res.json(rule);
    } catch {
        return res.status(404).json({ message: "Alert rule not found" });
    }
});

// DELETE /api/alerts/:id – delete alert rule
alertRouter.delete("/:id", async (req: AuthedRequest, res) => {
    try {
        const result = await deleteAlertRule(req.user!.sub, req.params.id);
        return res.json(result);
    } catch {
        return res.status(404).json({ message: "Alert rule not found" });
    }
});

// GET /api/alerts/history?projectId=xxx – alert send history
alertRouter.get("/history", async (req: AuthedRequest, res) => {
    const projectId = req.query.projectId as string;
    if (!projectId) {
        return res.status(400).json({ message: "projectId query param required" });
    }

    try {
        const history = await getAlertHistory(req.user!.sub, projectId);
        return res.json(history);
    } catch {
        return res.status(500).json({ message: "Failed to fetch alert history" });
    }
});
