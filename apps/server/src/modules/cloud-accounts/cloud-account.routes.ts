import { Router } from "express";
import { AuthedRequest, requireAuth } from "../../middleware/auth.middleware";
import { createCloudAccountSchema } from "./cloud-account.schema";
import {
    createCloudAccount,
    listCloudAccounts,
    deleteCloudAccount,
} from "./cloud-account.service";

export const cloudAccountRouter = Router();
cloudAccountRouter.use(requireAuth);

// POST /api/cloud-accounts – connect a cloud account
cloudAccountRouter.post("/", async (req: AuthedRequest, res) => {
    const parsed = createCloudAccountSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });
    }

    try {
        const account = await createCloudAccount(req.user!.sub, parsed.data);
        return res.status(201).json(account);
    } catch (error) {
        const msg = (error as Error).message;
        const status = msg.includes("Unique constraint") ? 409 : 400;
        return res.status(status).json({ message: msg });
    }
});

// GET /api/cloud-accounts?projectId=xxx – list accounts for a project
cloudAccountRouter.get("/", async (req: AuthedRequest, res) => {
    const projectId = req.query.projectId as string;
    if (!projectId) {
        return res.status(400).json({ message: "projectId query param required" });
    }

    try {
        const accounts = await listCloudAccounts(req.user!.sub, projectId);
        return res.json(accounts);
    } catch {
        return res.status(404).json({ message: "Project not found" });
    }
});

// DELETE /api/cloud-accounts/:id – disconnect a cloud account
cloudAccountRouter.delete("/:id", async (req: AuthedRequest, res) => {
    try {
        const result = await deleteCloudAccount(req.user!.sub, req.params.id);
        return res.json(result);
    } catch {
        return res.status(404).json({ message: "Cloud account not found" });
    }
});
