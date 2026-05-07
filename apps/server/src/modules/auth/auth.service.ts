import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Response } from "express";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { getRedis } from "../../lib/redis";
import { logger } from "../../lib/logger";
import { parseDurationToMs } from "../../lib/duration";
import { sendSecurityEmail } from "../alerts/alert.sender";
import { LoginInput, RegisterInput } from "./auth.schema";

const SALT_ROUNDS = 12;
const RESET_TOKEN_EXPIRY = 3600; // 1 hour in seconds
const RESET_TOKEN_PREFIX = "pwd-reset:";
const REFRESH_TOKEN_PREFIX = "refresh:";
const REFRESH_FAMILY_PREFIX = "refresh-family:";
const REFRESH_ROTATION_PREFIX = "refresh-rotation:";

// Grace window during which a just-rotated refresh token can be re-submitted
// (e.g. response packet dropped, browser retries the same cookie). Within
// this window we replay the same successor token instead of triggering
// reuse detection. Long enough for a normal retry, short enough that a
// stolen token can't be replayed casually.
const REFRESH_GRACE_SECONDS = 5;

// Resolved once at import — env is immutable for the process lifetime.
const ACCESS_TOKEN_TTL_MS = parseDurationToMs(env.JWT_EXPIRES_IN);
const REFRESH_TOKEN_TTL_MS = env.REFRESH_TOKEN_EXPIRES_IN * 1000;

/**
 * Refresh-token state stored at refresh:<jti>. We keep tokens around (with
 * `consumed: 1`) for the full TTL after rotation so that an attacker
 * replaying an already-rotated token can be DETECTED, not silently rejected.
 */
interface RefreshRecord {
    familyId: string;
    userId: string;
    consumed: 0 | 1;
}

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
  res.cookie("access_token", accessToken, getCookieOptions(ACCESS_TOKEN_TTL_MS));
  res.cookie("refresh_token", refreshToken, getCookieOptions(REFRESH_TOKEN_TTL_MS));
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
 * Issue a refresh token within an existing family. Used by both initial
 * login (with a fresh familyId) and rotation (with the existing familyId).
 * Storage: `refresh:<jti>` → JSON record, plus `refresh-family:<fid>` set
 * tracking every jti ever issued to this family (so the whole chain can be
 * blown up if reuse is detected).
 */
async function issueRefreshToken(userId: string, familyId: string): Promise<string> {
    const tokenId = crypto.randomBytes(32).toString("hex");
    const refreshToken = jwt.sign(
        { sub: userId, jti: tokenId, fid: familyId, type: "refresh" },
        getRefreshSecret(),
        { expiresIn: env.REFRESH_TOKEN_EXPIRES_IN }
    );

    try {
        const redis = getRedis();
        const record: RefreshRecord = { familyId, userId, consumed: 0 };
        const ttl = env.REFRESH_TOKEN_EXPIRES_IN;
        await redis
            .multi()
            .setex(`${REFRESH_TOKEN_PREFIX}${tokenId}`, ttl, JSON.stringify(record))
            .sadd(`${REFRESH_FAMILY_PREFIX}${familyId}`, tokenId)
            .expire(`${REFRESH_FAMILY_PREFIX}${familyId}`, ttl)
            .exec();
    } catch {
        logger.warn("Redis unavailable — refresh token stored only in JWT");
    }

    return refreshToken;
}

/**
 * Start a brand-new refresh-token family (one per login session).
 */
async function generateRefreshToken(userId: string): Promise<string> {
    const familyId = crypto.randomUUID();
    return issueRefreshToken(userId, familyId);
}

/**
 * Fire-and-forget security event notification. Looks up the user's email
 * and dispatches a notice; never blocks or throws on the auth flow.
 */
async function notifySecurityEvent(
    userId: string,
    eventType: "refresh_token_reuse",
): Promise<void> {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, name: true },
        });
        if (!user) return;
        await sendSecurityEmail({
            to: user.email,
            userName: user.name,
            eventType,
            detectedAt: new Date(),
        });
    } catch (err) {
        logger.error(`Security email dispatch failed: ${(err as Error).message}`);
    }
}

/**
 * Tear down an entire refresh-token family. Called on logout (single-device)
 * and on reuse detection (force-revoke a hijacked chain).
 */
async function revokeFamily(familyId: string): Promise<void> {
    try {
        const redis = getRedis();
        const familyKey = `${REFRESH_FAMILY_PREFIX}${familyId}`;
        const jtis = await redis.smembers(familyKey);
        const keys = jtis.map((j) => `${REFRESH_TOKEN_PREFIX}${j}`);
        keys.push(familyKey);
        await redis.del(...keys);
    } catch {
        // Redis down — JWT remains valid until natural expiry. Documented trade-off.
    }
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
 *
 * Family-based rotation with reuse detection:
 *   - The current tip rotates → old jti marked `consumed`, new jti issued in
 *     the same family.
 *   - Replaying a `consumed` jti = REUSE → revoke the entire family and
 *     force re-login. Either the legit user (whose chain advanced normally)
 *     or an attacker (replaying a token) is now hard-stopped.
 */
export async function refreshAccessToken(refreshTokenStr: string) {
    let payload: any;
    try {
        payload = jwt.verify(refreshTokenStr, getRefreshSecret());
    } catch {
        throw new Error("Invalid or expired refresh token");
    }

    if (payload.type !== "refresh" || !payload.jti || !payload.fid) {
        throw new Error("Invalid token type");
    }

    let redisAuthoritative = false;
    let cachedRotation: string | null = null;
    try {
        const redis = getRedis();
        const raw = await redis.get(`${REFRESH_TOKEN_PREFIX}${payload.jti}`);
        // From this point on, we have authoritative state from Redis. Any
        // subsequent failure must abort — silently issuing tokens without
        // marking the predecessor consumed would re-open the reuse window.
        redisAuthoritative = true;

        if (!raw) {
            throw new Error("Refresh token revoked");
        }

        const record: RefreshRecord = JSON.parse(raw);
        if (record.userId !== payload.sub || record.familyId !== payload.fid) {
            throw new Error("Refresh token revoked");
        }

        if (record.consumed === 1) {
            // Already-rotated token. Two possibilities:
            //   (a) Legitimate retry within the grace window (network hiccup,
            //       client never received the response). Replay the same
            //       successor token so the user's session continues cleanly.
            //   (b) Reuse beyond the grace window — almost certainly an
            //       attacker replaying a stolen token. Blow the family.
            cachedRotation = await redis.get(`${REFRESH_ROTATION_PREFIX}${payload.jti}`);
            if (cachedRotation) {
                // Fall through; the user lookup + access-token re-issue
                // happens below using cachedRotation as the refresh token.
            } else {
                logger.error("Refresh token reuse detected — revoking family", {
                    userId: payload.sub,
                    familyId: payload.fid,
                });
                await revokeFamily(payload.fid);
                await notifySecurityEvent(payload.sub, "refresh_token_reuse");
                throw new Error("Refresh token revoked");
            }
        } else {
            // First-time consumption. Mark consumed but keep the record for
            // the remaining TTL so reuse remains detectable until the JWT
            // itself expires.
            record.consumed = 1;
            const ttl = await redis.ttl(`${REFRESH_TOKEN_PREFIX}${payload.jti}`);
            const safeTtl = ttl > 0 ? ttl : env.REFRESH_TOKEN_EXPIRES_IN;
            await redis.setex(
                `${REFRESH_TOKEN_PREFIX}${payload.jti}`,
                safeTtl,
                JSON.stringify(record),
            );
        }
    } catch (err) {
        if ((err as Error).message === "Refresh token revoked") throw err;
        if (redisAuthoritative) throw err;
        // Redis was never reachable — degrade to JWT-only validation. Reuse
        // cannot be detected in this mode; security falls back to the JWT
        // signature alone. Once Redis recovers, normal protection resumes.
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

    if (cachedRotation) {
        // Grace-window retry: hand back the same refresh token we issued on
        // the original (lost) response. No new family member is created.
        return { accessToken: newAccessToken, refreshToken: cachedRotation, user };
    }

    const newRefreshToken = await issueRefreshToken(user.id, payload.fid);

    // Cache the rotation result for the grace window so a retry of the same
    // (now consumed) refresh token replays this successor instead of being
    // treated as reuse.
    try {
        const redis = getRedis();
        await redis.setex(
            `${REFRESH_ROTATION_PREFIX}${payload.jti}`,
            REFRESH_GRACE_SECONDS,
            newRefreshToken,
        );
    } catch {
        // Cache write failure → grace window won't catch a retry, but the
        // rotation itself succeeded. Worst case: legitimate retry trips
        // reuse detection. Acceptable.
    }

    return { accessToken: newAccessToken, refreshToken: newRefreshToken, user };
}

/**
 * Revoke a refresh token on logout. This tears down the entire family for
 * this device (i.e. the current jti AND any earlier consumed jtis in the
 * same chain), so a stolen-but-still-stored token cannot be replayed after
 * a user clicks logout.
 */
export async function revokeRefreshToken(refreshTokenStr: string): Promise<void> {
    try {
        const payload = jwt.verify(refreshTokenStr, getRefreshSecret()) as any;
        if (payload.fid) {
            await revokeFamily(payload.fid);
        } else if (payload.jti) {
            // Legacy token (issued before family rotation landed) — best-effort.
            try {
                const redis = getRedis();
                await redis.del(`${REFRESH_TOKEN_PREFIX}${payload.jti}`);
            } catch {
                /* ignore */
            }
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
