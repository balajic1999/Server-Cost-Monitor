import { describe, it, expect } from "vitest";
import { parseDurationToMs } from "./duration";

describe("parseDurationToMs", () => {
    it("passes through numeric input", () => {
        expect(parseDurationToMs(5_000)).toBe(5_000);
    });

    it("parses milliseconds", () => {
        expect(parseDurationToMs("500ms")).toBe(500);
    });

    it("parses seconds, minutes, hours, days", () => {
        expect(parseDurationToMs("30s")).toBe(30_000);
        expect(parseDurationToMs("15m")).toBe(15 * 60_000);
        expect(parseDurationToMs("2h")).toBe(2 * 3_600_000);
        expect(parseDurationToMs("1d")).toBe(86_400_000);
    });

    it("treats a bare number string as milliseconds", () => {
        expect(parseDurationToMs("250")).toBe(250);
    });

    it("tolerates surrounding whitespace", () => {
        expect(parseDurationToMs("  10s  ")).toBe(10_000);
    });

    it("throws on garbage input", () => {
        expect(() => parseDurationToMs("forever")).toThrow(/Invalid duration/);
        expect(() => parseDurationToMs("5x")).toThrow(/Invalid duration/);
    });
});
