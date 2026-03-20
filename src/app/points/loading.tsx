/** Route-level shell while the Points client bundle loads. */
export default function PointsLoading() {
  return (
    <div className="space-y-6 max-w-[1440px] mx-auto animate-pulse" aria-busy="true" aria-label="Loading points">
      <div className="space-y-2">
        <div className="h-8 w-72 bg-muted rounded-md" />
        <div className="h-4 w-full max-w-md bg-muted/70 rounded-md" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg border bg-card" />
        ))}
      </div>
      <div className="h-[280px] rounded-lg border bg-card" />
    </div>
  );
}
