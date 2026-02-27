import { Request, Response, NextFunction } from "express";

/**
 * Simple in-memory rate limiter middleware.
 * Limits requests per IP within a time window.
 *
 * @param windowMs  - Time window in milliseconds
 * @param maxHits   - Max requests allowed per window
 */
export function rateLimit(windowMs: number = 15 * 60 * 1000, maxHits: number = 50) {
    const hits = new Map<string, { count: number; resetAt: number }>();

    // Clean up stale entries every 5 minutes
    setInterval(() => {
        const now = Date.now();
        for (const [key, val] of hits) {
            if (now > val.resetAt) hits.delete(key);
        }
    }, 5 * 60 * 1000).unref();

    return (req: Request, res: Response, next: NextFunction) => {
        const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
        const now = Date.now();
        const record = hits.get(ip);

        if (!record || now > record.resetAt) {
            hits.set(ip, { count: 1, resetAt: now + windowMs });
            res.setHeader("X-RateLimit-Limit", maxHits);
            res.setHeader("X-RateLimit-Remaining", maxHits - 1);
            return next();
        }

        record.count++;

        if (record.count > maxHits) {
            const retryAfter = Math.ceil((record.resetAt - now) / 1000);
            res.setHeader("Retry-After", retryAfter);
            res.setHeader("X-RateLimit-Limit", maxHits);
            res.setHeader("X-RateLimit-Remaining", 0);
            return res.status(429).json({
                message: "Too many requests. Please try again later.",
                retryAfter,
            });
        }

        res.setHeader("X-RateLimit-Limit", maxHits);
        res.setHeader("X-RateLimit-Remaining", maxHits - record.count);
        return next();
    };
}
