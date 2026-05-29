export default function DashboardLoading() {
    return (
        <div className="mx-auto max-w-5xl animate-pulse space-y-8">
            <div className="h-7 w-48 rounded bg-muted-strong/60" />
            <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
                <div className="h-3 w-28 rounded bg-muted-strong/60" />
                <div className="mt-4 h-10 w-44 rounded bg-muted-strong/60" />
                <div className="mt-6 h-20 w-full rounded bg-muted-strong/60" />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
                <div className="h-44 rounded-lg border border-border bg-surface shadow-sm" />
                <div className="h-44 rounded-lg border border-border bg-surface shadow-sm" />
            </div>
        </div>
    );
}
