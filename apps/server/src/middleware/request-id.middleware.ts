import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

declare global {
    namespace Express {
        interface Request {
            requestId?: string;
        }
    }
}

/**
 * Assigns a unique request ID to each incoming request.
 * Sets X-Request-Id header on the response for tracing.
 * Logs access details on response finish.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
    const id = (req.headers["x-request-id"] as string) || logger.generateRequestId();
    req.requestId = id;
    res.setHeader("X-Request-Id", id);

    const start = Date.now();
    res.on("finish", () => {
        const duration = Date.now() - start;
        const meta = {
            requestId: id,
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            duration,
        };

        if (res.statusCode >= 500) {
            logger.error(`${req.method} ${req.originalUrl} ${res.statusCode}`, meta);
        } else if (res.statusCode >= 400) {
            logger.warn(`${req.method} ${req.originalUrl} ${res.statusCode}`, meta);
        } else {
            logger.info(`${req.method} ${req.originalUrl} ${res.statusCode}`, meta);
        }
    });

    next();
}
