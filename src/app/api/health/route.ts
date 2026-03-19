// Placeholder API route for the future Next.js backend integration.
// Vite doesn't treat this specially today; it's here to reserve the route shape.
export async function GET() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

