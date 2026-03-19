/**
 * Legacy Vite entry (`npm run dev:vite`). The production app runs on Next.js (`npm run dev`).
 */
const App = () => (
  <div className="min-h-screen flex items-center justify-center bg-muted p-8 font-sans text-center">
    <div className="max-w-md space-y-3">
      <h1 className="text-xl font-bold">Presidential Digs — Next.js</h1>
      <p className="text-sm text-muted-foreground">
        This UI is served by the Next.js App Router. Run <code className="font-mono text-xs bg-card px-1 py-0.5 rounded">npm run dev</code>{" "}
        (default port 8080).
      </p>
    </div>
  </div>
);

export default App;
