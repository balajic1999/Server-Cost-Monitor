export default function DashboardLoading() {
    return (
        <div className="max-w-6xl mx-auto space-y-6 p-4 animate-pulse">
            {/* Header skeleton */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="h-7 w-48 rounded-lg bg-slate-800" />
                    <div className="h-4 w-72 rounded-lg bg-slate-800 mt-2" />
                </div>
                <div className="h-10 w-32 rounded-xl bg-slate-800" />
            </div>

            {/* Stat cards skeleton */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-28 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                        <div className="h-3 w-24 rounded bg-slate-800" />
                        <div className="h-8 w-20 rounded bg-slate-800 mt-3" />
                        <div className="h-3 w-32 rounded bg-slate-800 mt-2" />
                    </div>
                ))}
            </div>

            {/* Chart skeleton */}
            <div className="h-64 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                <div className="h-5 w-40 rounded bg-slate-800" />
                <div className="h-3 w-60 rounded bg-slate-800 mt-2" />
                <div className="mt-8 flex items-end gap-1" style={{ height: "150px" }}>
                    {Array.from({ length: 20 }).map((_, i) => (
                        <div
                            key={i}
                            className="flex-1 rounded-t bg-slate-800"
                            style={{ height: `${30 + Math.random() * 70}%` }}
                        />
                    ))}
                </div>
            </div>

            {/* Table skeleton */}
            <div className="h-48 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                <div className="h-5 w-48 rounded bg-slate-800" />
                <div className="mt-6 space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-4">
                            <div className="h-4 w-32 rounded bg-slate-800" />
                            <div className="h-4 flex-1 rounded bg-slate-800" />
                            <div className="h-4 w-20 rounded bg-slate-800" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
