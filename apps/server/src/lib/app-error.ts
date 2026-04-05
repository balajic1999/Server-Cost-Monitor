/**
 * Application errors with explicit HTTP status (used by services and sanitizeError).
 */
export class AppError extends Error {
    constructor(
        public statusCode: number,
        message: string
    ) {
        super(message);
        this.name = "AppError";
    }
}
