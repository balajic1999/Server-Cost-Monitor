import { describe, it, expect } from "vitest";
import { runWithRequestContext, getRequestId } from "./request-context";

describe("request-context", () => {
    it("returns undefined outside of any run()", () => {
        expect(getRequestId()).toBeUndefined();
    });

    it("exposes the requestId synchronously inside run()", () => {
        runWithRequestContext({ requestId: "req-1" }, () => {
            expect(getRequestId()).toBe("req-1");
        });
    });

    it("preserves the requestId across awaited async work", async () => {
        await runWithRequestContext({ requestId: "req-2" }, async () => {
            await new Promise((r) => setTimeout(r, 5));
            expect(getRequestId()).toBe("req-2");
        });
    });

    it("isolates contexts between concurrent runs", async () => {
        const seenA: (string | undefined)[] = [];
        const seenB: (string | undefined)[] = [];

        const a = runWithRequestContext({ requestId: "A" }, async () => {
            await new Promise((r) => setTimeout(r, 10));
            seenA.push(getRequestId());
        });
        const b = runWithRequestContext({ requestId: "B" }, async () => {
            await new Promise((r) => setTimeout(r, 5));
            seenB.push(getRequestId());
        });

        await Promise.all([a, b]);

        expect(seenA).toEqual(["A"]);
        expect(seenB).toEqual(["B"]);
    });

    it("clears the context after run() returns", async () => {
        await runWithRequestContext({ requestId: "req-3" }, async () => {
            // inside run
        });
        expect(getRequestId()).toBeUndefined();
    });
});
