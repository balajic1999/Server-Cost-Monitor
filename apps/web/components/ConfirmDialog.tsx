"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { btnDanger, btnPrimary, btnSecondary, headingTitleClass } from "../lib/ui";

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    description?: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: "danger" | "default";
    busy?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({
    open,
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    tone = "default",
    busy = false,
    onConfirm,
    onCancel
}: ConfirmDialogProps) {
    const confirmRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !busy) onCancel();
        };
        window.addEventListener("keydown", onKey);
        confirmRef.current?.focus();
        return () => window.removeEventListener("keydown", onKey);
    }, [open, busy, onCancel]);

    if (!open) return null;

    const confirmClass = tone === "danger" ? btnDanger : btnPrimary;

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 p-4 sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            onClick={(e) => {
                if (e.target === e.currentTarget && !busy) onCancel();
            }}
        >
            <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-xl">
                <h2 id="confirm-dialog-title" className={headingTitleClass}>
                    {title}
                </h2>
                {description ? (
                    <div className="mt-2 text-sm text-muted-foreground">{description}</div>
                ) : null}
                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button type="button" onClick={onCancel} disabled={busy} className={btnSecondary}>
                        {cancelLabel}
                    </button>
                    <button
                        ref={confirmRef}
                        type="button"
                        onClick={onConfirm}
                        disabled={busy}
                        className={confirmClass}
                    >
                        {busy ? "…" : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
