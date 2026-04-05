import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma";
import { sanitizeError } from "../../lib/error-utils";
import { AuthedRequest, requireAuth } from "../../middleware/auth.middleware";
import {
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPassword,
  refreshAccessToken,
  revokeRefreshToken,
  setAuthCookies,
  clearAuthCookies,
} from "./auth.service";
import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema } from "./auth.schema";
import { z } from "zod";
import { authRateLimiter } from "../../middleware/rate-limiter.middleware";

export const authRouter = Router();

// ── Register ─────────────────────────────────────────
authRouter.post("/register", authRateLimiter, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });
  }

  try {
    const result = await registerUser(parsed.data);

    // Set httpOnly cookies
    setAuthCookies(res, result.accessToken, result.refreshToken);

    return res.status(201).json({
      user: result.user,
    });
  } catch (error) {
    const { message, status } = sanitizeError(error);
    return res.status(status).json({ message });
  }
});

// ── Login ────────────────────────────────────────────
authRouter.post("/login", authRateLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });
  }

  try {
    const result = await loginUser(parsed.data);

    // Set httpOnly cookies
    setAuthCookies(res, result.accessToken, result.refreshToken);

    return res.json({
      user: result.user,
    });
  } catch (error) {
    const { message } = sanitizeError(error, 401);
    return res.status(401).json({ message });
  }
});

// ── Refresh Token ────────────────────────────────────
authRouter.post("/refresh", async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refresh_token;
  if (!refreshToken) {
    return res.status(401).json({ message: "No refresh token" });
  }

  try {
    const result = await refreshAccessToken(refreshToken);

    // Set new cookies (token rotation)
    setAuthCookies(res, result.accessToken, result.refreshToken);

    return res.json({ user: result.user });
  } catch (error) {
    // Clear invalid cookies
    clearAuthCookies(res);
    const { message } = sanitizeError(error, 401);
    return res.status(401).json({ message });
  }
});

// ── Logout ───────────────────────────────────────────
authRouter.post("/logout", async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refresh_token;

  // Revoke refresh token in Redis
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }

  // Clear cookies
  clearAuthCookies(res);

  return res.json({ message: "Logged out successfully" });
});

// ── Get Current User (protected) ─────────────────────
authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.sub;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  if (!user) return res.status(404).json({ message: "User not found" });
  return res.json(user);
});

// ── Update Profile (protected) ───────────────────────
authRouter.put("/me", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.sub;
  const schema = z.object({ name: z.string().min(2).max(80).optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Validation failed" });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: parsed.data,
    select: { id: true, email: true, name: true, createdAt: true },
  });

  return res.json(updated);
});

// ── Change Password (protected) ──────────────────────
authRouter.put("/me/password", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.sub;
  const schema = z.object({
    currentPassword: z.string(),
    newPassword: z.string().min(8),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Validation failed" });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ message: "User not found" });

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    return res.status(400).json({ message: "Current password is incorrect" });
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  return res.json({ message: "Password updated successfully" });
});

// ── Forgot Password (public) ────────────────────────
authRouter.post("/forgot-password", authRateLimiter, async (req, res) => {
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

    return res.json({ message: "If that email is registered, a reset link has been sent." });
  } catch (error) {
    const { message, status } = sanitizeError(error, 500);
    return res.status(status).json({ message });
  }
});

// ── Reset Password (public) ─────────────────────────
authRouter.post("/reset-password", authRateLimiter, async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten() });
  }

  try {
    await resetPassword(parsed.data.token, parsed.data.newPassword);
    return res.json({ message: "Password has been reset successfully. You can now log in." });
  } catch (error) {
    const { message, status } = sanitizeError(error);
    return res.status(status).json({ message });
  }
});
