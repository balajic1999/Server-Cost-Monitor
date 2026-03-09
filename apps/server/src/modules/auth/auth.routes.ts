import { Router } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma";
import { AuthedRequest, requireAuth } from "../../middleware/auth.middleware";
import { loginUser, registerUser, requestPasswordReset, resetPassword } from "./auth.service";
import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema } from "./auth.schema";
import { z } from "zod";
import { rateLimit } from "../../middleware/rate-limit.middleware";

export const authRouter = Router();

// Rate limiters: stricter for register, moderate for login
const loginLimiter = rateLimit(15 * 60 * 1000, 10);   // 10 attempts per 15 min
const registerLimiter = rateLimit(15 * 60 * 1000, 5);  // 5 attempts per 15 min

authRouter.post("/register", registerLimiter, async (req, res) => {
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

authRouter.post("/login", loginLimiter, async (req, res) => {
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

// ── Forgot password (public) ─────────────────────────────
const forgotPasswordLimiter = rateLimit(15 * 60 * 1000, 5); // 5 attempts per 15 min

authRouter.post("/forgot-password", forgotPasswordLimiter, async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });
  }

  try {
    const result = await requestPasswordReset(parsed.data.email);

    // In development, return the token for testing
    if (process.env.NODE_ENV !== "production" && result.token) {
      return res.json({
        message: "If that email is registered, a reset link has been sent.",
        resetToken: result.token,
      });
    }

    // Always return success to prevent user enumeration
    return res.json({ message: "If that email is registered, a reset link has been sent." });
  } catch (error) {
    return res.status(500).json({ message: (error as Error).message });
  }
});

// ── Reset password (public) ──────────────────────────────
const resetPasswordLimiter = rateLimit(15 * 60 * 1000, 5);

authRouter.post("/reset-password", resetPasswordLimiter, async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });
  }

  try {
    await resetPassword(parsed.data.token, parsed.data.newPassword);
    return res.json({ message: "Password has been reset successfully. You can now log in." });
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  }
});
