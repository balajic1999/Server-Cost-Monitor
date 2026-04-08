"use client";

import { useEffect } from "react";
import { btnPrimary, btnSecondary } from "../lib/ui";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] items-center justify-center bg-zinc-50 p-6">
      <div className="w-full max-w-md text-center">
        <h2 className="text-lg font-semibold text-zinc-900">Something went wrong</h2>
        <p className="mt-2 text-sm text-zinc-500">{error.message || "Please try again."}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={reset} className={btnPrimary}>
            Try again
          </button>
          <button type="button" onClick={() => (window.location.href = "/dashboard")} className={btnSecondary}>
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
