import type { ReactNode } from "react";
import { metricLabelClass } from "../lib/ui";

interface MetricProps {
    label: string;
    value: ReactNode;
    trend?: ReactNode;
    size?: "sm" | "md" | "lg";
}

const valueSize = {
    sm: "font-serif text-lg font-medium leading-none tabular-nums text-foreground",
    md: "font-serif text-2xl font-medium leading-none tabular-nums text-foreground",
    lg: "font-serif text-4xl font-medium leading-none tabular-nums text-foreground"
};

export function Metric({ label, value, trend, size = "md" }: MetricProps) {
    return (
        <div className="flex flex-col gap-2">
            <span className={metricLabelClass}>{label}</span>
            <span className={valueSize[size]}>{value}</span>
            {trend ? <span className="text-xs text-muted-foreground">{trend}</span> : null}
        </div>
    );
}
