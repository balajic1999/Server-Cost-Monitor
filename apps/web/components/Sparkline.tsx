interface SparklineProps {
    values: number[];
    width?: number;
    height?: number;
    className?: string;
    title?: string;
}

export function Sparkline({ values, width = 800, height = 80, className = "", title = "Spend over time" }: SparklineProps) {
    if (values.length === 0) {
        return <div className={`h-20 ${className}`} aria-hidden />;
    }

    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;
    const stepX = values.length > 1 ? width / (values.length - 1) : 0;

    const points = values.map((v, i) => {
        const x = i * stepX;
        const y = height - ((v - min) / range) * height;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
    });

    const pathLine = `M ${points.join(" L ")}`;
    const pathFill = `${pathLine} L ${(values.length - 1) * stepX},${height} L 0,${height} Z`;

    return (
        <svg
            viewBox={`0 0 ${width} ${height}`}
            className={`w-full ${className}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={title}
        >
            <path d={pathFill} fill="currentColor" className="text-accent-soft" opacity={0.6} />
            <path d={pathLine} fill="none" stroke="currentColor" strokeWidth={2} className="text-accent" vectorEffect="non-scaling-stroke" />
        </svg>
    );
}
