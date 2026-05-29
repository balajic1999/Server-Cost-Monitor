import Link from "next/link";
import type { ReactNode } from "react";

interface EmptyStateProps {
    message: string;
    actionLabel?: string;
    actionHref?: string;
    onAction?: () => void;
    children?: ReactNode;
}

export function EmptyState({ message, actionLabel, actionHref, onAction, children }: EmptyStateProps) {
    return (
        <div className="py-6 text-sm text-muted-foreground">
            <p>{message}</p>
            {actionLabel && actionHref ? (
                <Link href={actionHref} className="mt-2 inline-flex items-center gap-1 text-accent hover:underline">
                    {actionLabel} <span aria-hidden>→</span>
                </Link>
            ) : null}
            {actionLabel && onAction ? (
                <button
                    type="button"
                    onClick={onAction}
                    className="mt-2 inline-flex items-center gap-1 text-accent hover:underline"
                >
                    {actionLabel} <span aria-hidden>→</span>
                </button>
            ) : null}
            {children}
        </div>
    );
}
