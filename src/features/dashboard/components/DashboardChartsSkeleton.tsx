/** Placeholder while Recharts chunk loads on the dashboard only */
export function DashboardChartsSkeleton() {
  return (
    <>
      <div className="lg:col-span-3 rounded-lg border bg-card p-5 animate-pulse">
        <div className="h-4 w-28 bg-muted rounded mb-4" />
        <div className="h-[200px] bg-muted/40 rounded-md" />
      </div>
      <div className="lg:col-span-2 rounded-lg border bg-card p-5 animate-pulse space-y-6">
        <div>
          <div className="h-4 w-48 bg-muted rounded mb-3" />
          <div className="h-[170px] bg-muted/40 rounded-md" />
        </div>
        <div>
          <div className="h-4 w-40 bg-muted rounded mb-3" />
          <div className="h-[170px] bg-muted/40 rounded-md" />
        </div>
      </div>
    </>
  );
}
