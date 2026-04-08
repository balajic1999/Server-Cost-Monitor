import { Router } from "express";
import { AuthedRequest, requireAuth } from "../../middleware/auth.middleware";
import { createProjectSchema, updateProjectSchema } from "./project.schema";
import {
    createProject,
    deleteProject,
    getProject,
    listProjects,
    updateProject,
} from "./project.service";

export const projectRouter = Router();

// All project routes require auth
projectRouter.use(requireAuth);

// POST /api/projects – create a new project
projectRouter.post("/", async (req: AuthedRequest, res) => {
    const parsed = createProjectSchema.safeParse(req.body);
    if (!parsed.success) {
        return res
            .status(400)
            .json({ message: "Validation failed", errors: parsed.error.flatten() });
    }

    try {
        const project = await createProject(req.user!.sub, parsed.data);
        return res.status(201).json(project);
    } catch (error) {
        const msg = (error as Error).message;
        const status = msg.includes("Unique constraint") ? 409 : 400;
        return res.status(status).json({ message: msg });
    }
});

// GET /api/projects – list user's projects
projectRouter.get("/", async (req: AuthedRequest, res) => {
    const projects = await listProjects(req.user!.sub);
    return res.json(projects);
});

// GET /api/projects/:id – get single project
projectRouter.get("/:id", async (req: AuthedRequest, res) => {
    try {
        const project = await getProject(req.user!.sub, req.params.id);
        return res.json(project);
    } catch {
        return res.status(404).json({ message: "Project not found" });
    }
});

// PATCH /api/projects/:id – update project
projectRouter.patch("/:id", async (req: AuthedRequest, res) => {
    const parsed = updateProjectSchema.safeParse(req.body);
    if (!parsed.success) {
        return res
            .status(400)
            .json({ message: "Validation failed", errors: parsed.error.flatten() });
    }

    try {
        const project = await updateProject(
            req.user!.sub,
            req.params.id,
            parsed.data
        );
        return res.json(project);
    } catch (error) {
        const msg = (error as Error).message;
        const status = msg.includes("not found") ? 404 : 400;
        return res.status(status).json({ message: msg });
    }
});

// DELETE /api/projects/:id – delete project
projectRouter.delete("/:id", async (req: AuthedRequest, res) => {
    try {
        const result = await deleteProject(req.user!.sub, req.params.id);
        return res.json(result);
    } catch {
        return res.status(404).json({ message: "Project not found" });
    }
});
