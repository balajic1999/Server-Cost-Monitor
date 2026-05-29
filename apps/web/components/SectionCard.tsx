import type { ReactNode } from "react";
import { headingTitleClass, sectionCardClass } from "../lib/ui";

interface SectionCardProps {
    title?: string;
    description?: string;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
    bodyClassName?: string;
}

export function SectionCard({ title, description, action, children, className = "", bodyClassName = "p-6" }: SectionCardProps) {
    return (
        <section className={`${sectionCardClass} ${className}`}>
            {title || description || action ? (
                <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-6 py-4">
                    <div className="min-w-0">
                        {title ? <h2 className={headingTitleClass}>{title}</h2> : null}
                        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
                    </div>
                    {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
                </header>
            ) : null}
            <div className={bodyClassName}>{children}</div>
        </section>
    );
}
