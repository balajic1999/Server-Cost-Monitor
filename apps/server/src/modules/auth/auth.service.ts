import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { getRedis } from "../../lib/redis";
import { logger } from "../../lib/logger";
import { LoginInput, RegisterInput } from "./auth.schema";

const SALT_ROUNDS = 12;
const RESET_TOKEN_EXPIRY = 3600; // 1 hour in seconds
const RESET_TOKEN_PREFIX = "pwd-reset:";

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
      passwordHash
    }
  });

  const token = jwt.sign({ sub: user.id, email: user.email }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN
  });

  return { token, user: { id: user.id, email: user.email, name: user.name } };
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

  const token = jwt.sign({ sub: user.id, email: user.email }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN
  });

  return { token, user: { id: user.id, email: user.email, name: user.name } };
}

/**
 * Generate a password reset token and store in Redis with 1-hour expiry.
 * Returns the token (to be sent via email).
 * Always returns success to prevent user enumeration.
 */
export async function requestPasswordReset(email: string): Promise<{ token: string | null }> {
  const user = await prisma.user.findUnique({ where: { email } });

  // Always return success to prevent user enumeration attacks
  if (!user) {
    logger.info(`Password reset requested for non-existent email: ${email}`);
    return { token: null };
  }

  const resetToken = crypto.randomBytes(32).toString("hex");

  try {
    const redis = getRedis();
    // Store: token -> email mapping with 1-hour expiry
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

  // Delete the used token
  try {
    const redis = getRedis();
    await redis.del(`${RESET_TOKEN_PREFIX}${token}`);
  } catch {
    // Non-critical
  }

  logger.info(`Password reset completed for ${email}`);
}
