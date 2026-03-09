import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

/**
 * Custom error class with HTTP status code.
 * Use this in services/routes to throw errors with specific status codes.
 */
export class AppError extends Error {
    constructor(public statusCode: number, message: string) {
        super(message);
        this.name = "AppError";
    }
}

/**
 * Global error handler — catches all unhandled errors from routes.
 * Returns consistent JSON shape. Hides stack traces in production.
 */
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
    const requestId = req.requestId;
    const statusCode = err instanceof AppError ? err.statusCode : 500;

    logger.error(`Unhandled error: ${err.message}`, {
        requestId,
        method: req.method,
        path: req.originalUrl,
    });

    const isProd = process.env.NODE_ENV === "production";

    res.status(statusCode).json({
        message: statusCode === 500 && isProd
            ? "Internal server error"
            : err.message,
        ...(requestId && { requestId }),
        ...(!isProd && { stack: err.stack }),
    });
}
