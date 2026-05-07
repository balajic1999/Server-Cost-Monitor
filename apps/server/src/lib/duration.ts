const UNITS: Record<string, number> = {
    ms: 1,
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
};

/**
 * Parse a short duration string ("15m", "2h", "1d", "500ms") or a number of
 * milliseconds into milliseconds. Used to keep cookie lifetimes in lockstep
 * with JWT_EXPIRES_IN without depending on jsonwebtoken's transitive `ms` lib.
 */
export function parseDurationToMs(input: string | number): number {
    if (typeof input === "number") return input;

    const match = /^(\d+)\s*(ms|s|m|h|d)?$/.exec(input.trim());
    if (!match) {
        throw new Error(`Invalid duration: "${input}" — expected e.g. "15m", "2h", "500ms"`);
    }

    const value = Number(match[1]);
    const unit = match[2] ?? "ms";
    return value * UNITS[unit];
}
