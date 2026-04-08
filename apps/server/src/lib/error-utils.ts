import { AppError } from "./app-error";

/**
 * Utility to convert raw error messages (including Prisma internals)
 * into user-friendly messages for API responses.
 */

const ERROR_MAP: { pattern: RegExp; message: string; status: number }[] = [
    // Prisma unique constraint violations — match both old and new formats
    {
        pattern: /Unique constraint failed.*(?:userId.*name|name.*userId|Project_userId_name)/i,
        message: "A project with this name already exists. Please choose a different name.",
        status: 409,
    },
    {
        pattern: /Unique constraint failed/i,
        message: "This record already exists. Please use different details.",
        status: 409,
    },
    // Prisma foreign key violations
    {
        pattern: /Foreign key constraint failed/i,
        message: "This operation references a record that doesn't exist or has been deleted.",
        status: 400,
    },
    // Prisma record not found
    {
        pattern: /Record to .* does not exist/i,
        message: "The requested record was not found.",
        status: 404,
    },
    // Prisma connection/timeout errors
    {
        pattern: /Can't reach database server/i,
        message: "Service temporarily unavailable. Please try again later.",
        status: 503,
    },
    {
        pattern: /timed? ?out/i,
        message: "The request took too long. Please try again.",
        status: 504,
    },
    // Generic Prisma invocation errors
    {
        pattern: /Invalid `prisma\.\w+\.\w+\(\)` invocation/i,
        message: "An unexpected error occurred. Please try again.",
        status: 500,
    },
    // AWS credential errors
    {
        pattern: /UnrecognizedClientException|InvalidClientTokenId|SignatureDoesNotMatch/i,
        message: "Invalid AWS credentials. Please check your access key and secret key.",
        status: 400,
    },
    {
        pattern: /AccessDeniedException|AccessDenied/i,
        message: "Access denied. Please ensure your credentials have the required permissions.",
        status: 403,
    },
    // GCP errors
    {
        pattern: /PERMISSION_DENIED/i,
        message: "GCP permission denied. Please check your service account permissions.",
        status: 403,
    },
    {
        pattern: /invalid_grant|Invalid JWT/i,
        message: "Invalid GCP credentials. Please check your service account key.",
        status: 400,
    },
    // Azure errors
    {
        pattern: /AADSTS\d+/i,
        message: "Azure authentication failed. Please verify your tenant, client ID, and secret.",
        status: 400,
    },
    // Network / fetch errors
    {
        pattern: /fetch failed|ECONNREFUSED|ENOTFOUND|network/i,
        message: "Failed to connect to the external service. Please try again later.",
        status: 502,
    },
];

/**
 * Map of Prisma error codes to user-friendly messages.
 * @see https://www.prisma.io/docs/reference/api-reference/error-reference
 */
const PRISMA_CODE_MAP: Record<string, { message: string; status: number }> = {
    P2002: { message: "This record already exists. Please use different details.", status: 409 },
    P2003: { message: "This operation references a record that doesn't exist or has been deleted.", status: 400 },
    P2025: { message: "The requested record was not found.", status: 404 },
};

export interface SanitizedError {
    message: string;
    status: number;
}

/**
 * Converts a raw error into a user-friendly message and appropriate HTTP status.
 * Known application errors (thrown from services with specific messages) are preserved.
 * Raw Prisma/infra errors get mapped to friendly messages.
 */
function p2002TargetHasUserIdAndName(target: unknown): boolean {
    if (Array.isArray(target)) {
        return target.map(String).includes("userId") && target.map(String).includes("name");
    }
    if (typeof target === "string") {
        return target.includes("userId") && target.includes("name");
    }
    return false;
}

export function sanitizeError(error: unknown, defaultStatus = 400): SanitizedError {
    if (error instanceof AppError) {
        return { message: error.message, status: error.statusCode };
    }

    const rawMessage = error instanceof Error ? error.message : String(error);

    // Check Prisma error code first (most reliable for Prisma errors)
    const prismaCode = (error as { code?: string })?.code;
    if (prismaCode && PRISMA_CODE_MAP[prismaCode]) {
        // For P2002 (unique constraint), check if it's specifically a project name conflict
        if (prismaCode === "P2002") {
            const meta = (error as { meta?: { target?: unknown } })?.meta;
            if (p2002TargetHasUserIdAndName(meta?.target)) {
                return {
                    message: "A project with this name already exists. Please choose a different name.",
                    status: 409,
                };
            }
        }
        return PRISMA_CODE_MAP[prismaCode];
    }

    // Check if the message matches known error patterns (for non-Prisma errors)
    for (const { pattern, message, status } of ERROR_MAP) {
        if (pattern.test(rawMessage)) {
            return { message, status };
        }
    }

    // If the error looks like an internal/framework error, hide the details
    const looksInternal =
        rawMessage.includes("prisma") ||
        rawMessage.includes("invocation in") ||
        rawMessage.includes("\n") ||
        rawMessage.length > 200;

    if (looksInternal) {
        return {
            message: "An unexpected error occurred. Please try again.",
            status: 500,
        };
    }

    // Preserve the original message for known app-level errors
    return { message: rawMessage, status: defaultStatus };
}

