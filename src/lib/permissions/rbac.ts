import type { SessionUser } from '@/lib/auth/auth';

// RBAC placeholder.
// Later: implement permission checks using role + route/action metadata.
export type Permission =
  | 'deals:read'
  | 'deals:write'
  | 'kpis:read'
  | 'kpis:write'
  | 'draws:read'
  | 'draws:approve'
  | 'points:read'
  | 'points:admin';

export function canAccess(_user: SessionUser | null, _permission: Permission): boolean {
  return true;
}

