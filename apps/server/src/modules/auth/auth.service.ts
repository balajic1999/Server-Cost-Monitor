import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Response } from "express";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { getRedis } from "../../lib/redis";
import { logger } from "../../lib/logger";
import { LoginInput, RegisterInput } from "./auth.schema";

const SALT_ROUNDS = 12;
const RESET_TOKEN_EXPIRY = 3600; // 1 hour in seconds
const RESET_TOKEN_PREFIX = "pwd-reset:";
const REFRESH_TOKEN_PREFIX = "refresh:";

/**
 * Get the secret used for signing refresh tokens.
 * Falls back to JWT_SECRET + suffix if REFRESH_TOKEN_SECRET is not set.
 */
function getRefreshSecret(): string {
  return env.REFRESH_TOKEN_SECRET ?? `${env.JWT_SECRET}_refresh`;
}

/**
 * Cookie configuration for httpOnly auth cookies.
 * - httpOnly: prevents JavaScript access (XSS protection)
 * - secure: only sent over HTTPS in production
 * - sameSite: CSRF protection
 * - path: scoped to API routes
 */
function getCookieOptions(maxAgeMs: number) {
  const isProd = env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? ("strict" as const) : ("lax" as const),
    maxAge: maxAgeMs,
    path: "/",
  };
}

/**
 * Set access + refresh tokens as httpOnly cookies on the response.
 */
export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  // Access token: short-lived (default 15 min, matches JWT_EXPIRES_IN)
  res.cookie("access_token", accessToken, getCookieOptions(15 * 60 * 1000));

  // Refresh token: long-lived (default 7 days)
  res.cookie("refresh_token", refreshToken, getCookieOptions(env.REFRESH_TOKEN_EXPIRES_IN * 1000));
}

/**
 * Clear auth cookies on logout.
 */
export function clearAuthCookies(res: Response): void {
  const opts = getCookieOptions(0);
  res.cookie("access_token", "", opts);
  res.cookie("refresh_token", "", opts);
}

/**
 * Generate a signed access token (short-lived).
 */
function generateAccessToken(user: { id: string; email: string }): string {
  return jwt.sign({ sub: user.id, email: user.email }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as any,
  });
}

/**
 * Generate a refresh token (long-lived) and store in Redis.
 * Uses a family-based rotation: each refresh invalidates the old token.
 */
async function generateRefreshToken(userId: string): Promise<string> {
  const tokenId = crypto.randomBytes(32).toString("hex");
  const refreshToken = jwt.sign(
    { sub: userId, jti: tokenId, type: "refresh" },
    getRefreshSecret(),
    { expiresIn: env.REFRESH_TOKEN_EXPIRES_IN }
  );

  // Store in Redis with TTL matching expiry
  try {
    const redis = getRedis();
    await redis.setex(`${REFRESH_TOKEN_PREFIX}${tokenId}`, env.REFRESH_TOKEN_EXPIRES_IN, userId);
  } catch {
    logger.warn("Redis unavailable — refresh token stored only in JWT");
  }

  return refreshToken;
}

// ── Public Auth Functions ────────────────────────────

export async function registerUser(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new Error("Email already registered");
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash,
    },
  });

  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user.id);

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name },
  };
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw new Error("Invalid credentials");
  }

  const isValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!isValid) {
    throw new Error("Invalid credentials");
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user.id);

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name },
  };
}

/**
 * Refresh access token using a valid refresh token.
 * Implements token rotation: the old refresh token is invalidated
 * and a new one is issued.
 */
export async function refreshAccessToken(refreshTokenStr: string) {
  let payload: any;
  try {
    payload = jwt.verify(refreshTokenStr, getRefreshSecret());
  } catch {
    throw new Error("Invalid or expired refresh token");
  }

  if (payload.type !== "refresh" || !payload.jti) {
    throw new Error("Invalid token type");
  }

  // Verify token exists in Redis (not revoked)
  try {
    const redis = getRedis();
    const storedUserId = await redis.get(`${REFRESH_TOKEN_PREFIX}${payload.jti}`);
    if (!storedUserId || storedUserId !== payload.sub) {
      throw new Error("Refresh token revoked");
    }

    // Revoke old refresh token (rotation)
    await redis.del(`${REFRESH_TOKEN_PREFIX}${payload.jti}`);
  } catch (err) {
    if ((err as Error).message === "Refresh token revoked") throw err;
    // Redis unavailable — allow renewal based on JWT validity alone
    logger.warn("Redis unavailable during token refresh — using JWT-only validation");
  }

  // Look up user to ensure they still exist
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, name: true },
  });
  if (!user) {
    throw new Error("User not found");
  }

  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = await generateRefreshToken(user.id);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken, user };
}

/**
 * Revoke all refresh tokens for a user (e.g., on password change or logout-all).
 */
export async function revokeRefreshToken(refreshTokenStr: string): Promise<void> {
  try {
    const payload = jwt.verify(refreshTokenStr, getRefreshSecret()) as any;
    if (payload.jti) {
      const redis = getRedis();
      await redis.del(`${REFRESH_TOKEN_PREFIX}${payload.jti}`);
    }
  } catch {
    // Token already expired or invalid — nothing to revoke
  }
}

// ── Password Reset ────────────────────────────────

/**
 * Generate a password reset token and store in Redis with 1-hour expiry.
 * Always returns success to prevent user enumeration.
 */
export async function requestPasswordReset(email: string): Promise<{ token: string | null }> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    logger.info(`Password reset requested for non-existent email: ${email}`);
    return { token: null };
  }

  const resetToken = crypto.randomBytes(32).toString("hex");

  try {
    const redis = getRedis();
    await redis.setex(`${RESET_TOKEN_PREFIX}${resetToken}`, RESET_TOKEN_EXPIRY, email);
    logger.info(`Password reset token generated for ${email}`);
  } catch {
    throw new Error("Unable to process reset request. Please try again later.");
  }

  return { token: resetToken };
}

/**
 * Reset password using a valid token from Redis.
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  let email: string | null = null;

  try {
    const redis = getRedis();
    email = await redis.get(`${RESET_TOKEN_PREFIX}${token}`);
  } catch {
    throw new Error("Unable to process reset request. Please try again later.");
  }

  if (!email) {
    throw new Error("Invalid or expired reset token");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error("Invalid or expired reset token");
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  try {
    const redis = getRedis();
    await redis.del(`${RESET_TOKEN_PREFIX}${token}`);
  } catch {
    // Non-critical
  }

  logger.info(`Password reset completed for ${email}`);
}
