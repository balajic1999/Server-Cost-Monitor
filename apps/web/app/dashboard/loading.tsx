export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse space-y-6">
      <div className="h-8 w-48 rounded-md bg-zinc-200" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="h-3 w-20 rounded bg-zinc-200" />
            <div className="mt-3 h-7 w-24 rounded bg-zinc-200" />
          </div>
        ))}
      </div>
      <div className="h-52 rounded-lg border border-zinc-200 bg-white shadow-sm" />
    </div>
  );
}
