import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { AuthedRequest, requireAuth } from "../../middleware/auth.middleware";
import { loginUser, registerUser } from "./auth.service";
import { loginSchema, registerSchema } from "./auth.schema";

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });
  }

  try {
    const result = await registerUser(parsed.data);
    return res.status(201).json(result);
  } catch (error) {
    return res.status(409).json({ message: (error as Error).message });
  }
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });
  }

  try {
    const result = await loginUser(parsed.data);
    return res.status(200).json(result);
  } catch {
    return res.status(401).json({ message: "Invalid credentials" });
  }
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user?.sub },
    select: { id: true, email: true, name: true, createdAt: true }
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json(user);
});
