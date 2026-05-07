import { AsyncLocalStorage } from "async_hooks";

interface RequestContext {
    requestId: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

/**
 * Run a callback inside a per-request context. Anything `await`ed from `fn`
 * — including DB calls, fetches, and downstream middleware — will see the
 * same context via `getRequestId()`. Each request gets its own run, so
 * concurrent requests don't bleed IDs across each other.
 */
export function runWithRequestContext<T>(ctx: RequestContext, fn: () => T): T {
    return storage.run(ctx, fn);
}

/** Returns the request ID for the current async context, if any. */
export function getRequestId(): string | undefined {
    return storage.getStore()?.requestId;
}
