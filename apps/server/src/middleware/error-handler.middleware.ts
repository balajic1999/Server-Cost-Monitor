import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

/**
 * Global error handler — catches all unhandled errors from routes.
 * Returns consistent JSON shape. Hides stack traces in production.
 */
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
    const requestId = (req as any).requestId;

    logger.error(`Unhandled error: ${err.message}`, {
        requestId,
        method: req.method,
        path: req.originalUrl,
    });

    const statusCode = (err as any).statusCode || 500;
    const isProd = process.env.NODE_ENV === "production";

    res.status(statusCode).json({
        message: statusCode === 500 && isProd
            ? "Internal server error"
            : err.message,
        ...(requestId && { requestId }),
        ...(!isProd && { stack: err.stack }),
    });
}
