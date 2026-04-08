import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(2).max(100),
  timezone: z.string().default("UTC"),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  timezone: z.string().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
