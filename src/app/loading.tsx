/**
 * Shown during route transitions while the next segment loads.
 * Main feature pages are client components; this still improves perceived latency for the RSC shell.
 */
export default function AppLoading() {
  return (
    <div className="space-y-6 max-w-[1440px] mx-auto animate-pulse" aria-busy="true" aria-label="Loading page">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-muted rounded-md" />
        <div className="h-4 w-full max-w-md bg-muted/70 rounded-md" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg border bg-card p-4 space-y-2">
            <div className="h-3 w-24 bg-muted rounded" />
            <div className="h-7 w-20 bg-muted/80 rounded" />
          </div>
        ))}
      </div>
      <div className="h-64 rounded-lg border bg-card" />
    </div>
  );
}
