// Auth placeholder.
// Next integration point:
// - NextAuth: session + middleware
// - Clerk: server-side auth helpers
export type SessionUser = {
  id: string;
  email: string;
  name?: string;
  role?: string;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  // TODO: wire up to real auth provider.
  return null;
}

