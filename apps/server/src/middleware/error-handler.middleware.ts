import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";
import { sanitizeError } from "../lib/error-utils";
import { AppError } from "../lib/app-error";

export { AppError };

/**
 * Global error handler — catches all unhandled errors from routes.
 * Returns consistent JSON shape. Always returns user-friendly messages.
 */
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
    const requestId = req.requestId;

    logger.error(`Unhandled error: ${err.message}`, {
        requestId,
        method: req.method,
        path: req.originalUrl,
        stack: err.stack,
    });

    // AppError = intentional errors with known status codes
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            message: err.message,
            ...(requestId && { requestId }),
        });
    }

    // All other errors get sanitized to prevent internal details leaking
    const { message, status } = sanitizeError(err, 500);

    res.status(status).json({
        message,
        ...(requestId && { requestId }),
    });
}
