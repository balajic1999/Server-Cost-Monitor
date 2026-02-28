import { randomUUID } from "crypto";

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LEVEL = (process.env.LOG_LEVEL as LogLevel) || "info";
const IS_PROD = process.env.NODE_ENV === "production";

const COLORS: Record<LogLevel, string> = {
    debug: "\x1b[90m",   // gray
    info: "\x1b[36m",    // cyan
    warn: "\x1b[33m",    // yellow
    error: "\x1b[31m",   // red
};
const RESET = "\x1b[0m";

interface LogMeta {
    requestId?: string;
    method?: string;
    path?: string;
    statusCode?: number;
    duration?: number;
    userId?: string;
    [key: string]: unknown;
}

function shouldLog(level: LogLevel): boolean {
    return LEVEL_ORDER[level] >= LEVEL_ORDER[MIN_LEVEL];
}

function formatMessage(level: LogLevel, message: string, meta?: LogMeta): string {
    if (IS_PROD) {
        // Structured JSON for production (parseable by ELK, Datadog, CloudWatch)
        return JSON.stringify({
            timestamp: new Date().toISOString(),
            level,
            message,
            ...meta,
        });
    }

    // Dev-friendly colored output
    const ts = new Date().toLocaleTimeString("en-US", { hour12: false });
    const color = COLORS[level];
    const pad = level.toUpperCase().padEnd(5);
    const rid = meta?.requestId ? ` [${meta.requestId.slice(0, 8)}]` : "";
    const extras = meta
        ? " " + Object.entries(meta)
            .filter(([k]) => k !== "requestId")
            .map(([k, v]) => `${k}=${v}`)
            .join(" ")
        : "";
    return `${color}${ts} ${pad}${RESET}${rid} ${message}${extras ? `  ${COLORS.debug}${extras}${RESET}` : ""}`;
}

function createLogger() {
    return {
        debug(message: string, meta?: LogMeta) {
            if (shouldLog("debug")) console.debug(formatMessage("debug", message, meta));
        },
        info(message: string, meta?: LogMeta) {
            if (shouldLog("info")) console.info(formatMessage("info", message, meta));
        },
        warn(message: string, meta?: LogMeta) {
            if (shouldLog("warn")) console.warn(formatMessage("warn", message, meta));
        },
        error(message: string, meta?: LogMeta) {
            if (shouldLog("error")) console.error(formatMessage("error", message, meta));
        },
        /** Create a child logger that always includes the given requestId */
        child(requestId: string) {
            return {
                debug: (msg: string, m?: LogMeta) => createLogger().debug(msg, { requestId, ...m }),
                info: (msg: string, m?: LogMeta) => createLogger().info(msg, { requestId, ...m }),
                warn: (msg: string, m?: LogMeta) => createLogger().warn(msg, { requestId, ...m }),
                error: (msg: string, m?: LogMeta) => createLogger().error(msg, { requestId, ...m }),
            };
        },
        /** Generate a new request ID */
        generateRequestId(): string {
            return randomUUID();
        },
    };
}

export const logger = createLogger();
