import { Router } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma";
import { AuthedRequest, requireAuth } from "../../middleware/auth.middleware";
import { loginUser, registerUser } from "./auth.service";
import { loginSchema, registerSchema } from "./auth.schema";
import { z } from "zod";

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

// ── Update profile ───────────────────────────────────────

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
});

authRouter.put("/me", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });
  }

  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  // Check email uniqueness if changing
  if (parsed.data.email) {
    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing && existing.id !== userId) {
      return res.status(409).json({ message: "Email already in use" });
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: parsed.data,
    select: { id: true, email: true, name: true, createdAt: true },
  });

  return res.json(user);
});

// ── Change password ──────────────────────────────────────

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

authRouter.put("/me/password", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });
  }

  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ message: "User not found" });

  const isValid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!isValid) {
    return res.status(400).json({ message: "Current password is incorrect" });
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  return res.json({ message: "Password updated successfully" });
});
