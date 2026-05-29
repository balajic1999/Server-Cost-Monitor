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
    <div className="flex min-h-[400px] items-center justify-center bg-background p-6">
      <div className="w-full max-w-md text-center">
        <h2 className="font-serif text-3xl font-medium tracking-tight text-foreground">Something went wrong</h2>
        <p className="mt-2 text-sm text-muted-foreground">{error.message || "Please try again."}</p>
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
