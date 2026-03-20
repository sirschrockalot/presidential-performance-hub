/** Route-level shell while the KPI client bundle loads. */
export default function KpisLoading() {
  return (
    <div className="space-y-6 max-w-[1200px] mx-auto animate-pulse" aria-busy="true" aria-label="Loading KPIs">
      <div className="space-y-2">
        <div className="h-8 w-56 bg-muted rounded-md" />
        <div className="h-4 w-full max-w-lg bg-muted/70 rounded-md" />
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="h-9 w-32 bg-muted rounded-md" />
        <div className="h-9 w-44 bg-muted rounded-md" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg border bg-card" />
        ))}
      </div>
      <div className="h-[280px] rounded-lg border bg-card" />
    </div>
  );
}
