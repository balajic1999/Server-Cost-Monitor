"use client";

import { useEffect } from "react";
import { btnPrimary, btnSecondary } from "../../lib/ui";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h2 className="text-lg font-semibold text-zinc-900">Something went wrong</h2>
        <p className="mt-2 text-sm text-zinc-500">Try again or return to the dashboard.</p>
        {error.message && process.env.NODE_ENV === "development" && (
          <pre className="mt-4 max-h-32 overflow-auto rounded-md border border-zinc-200 bg-zinc-50 p-3 text-left text-xs text-red-700">
            {error.message}
          </pre>
        )}
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
