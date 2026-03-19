# Presidential Digs Performance Hub — Cursor Handoff Guide

## Architecture Overview

```
src/
├── components/
│   ├── layout/          # AppLayout, AppSidebar, TopBar
│   ├── shared/          # Reusable: DataTable, MetricCard, StatusBadge, PageHeader,
│   │                    #   ActivityFeed, EmptyState, LoadingState, ConfirmDialog
│   └── ui/              # shadcn/ui primitives (do not edit directly)
├── data/
│   ├── mock-data.ts     # All seed data — DELETE when Prisma is wired
│   └── activity-feed.ts # Mock activity events
├── hooks/               # React Query hooks — thin wrappers over services
│   ├── use-deals.ts
│   ├── use-draws.ts
│   ├── use-kpis.ts
│   ├── use-points.ts
│   └── use-team.ts
├── pages/               # Route-level page components
├── services/            # ★ SWAP POINT — replace mock imports with API/Prisma calls
│   ├── deals.service.ts
│   ├── draws.service.ts
│   ├── kpis.service.ts
│   ├── points.service.ts
│   └── team.service.ts
├── types/
│   └── index.ts         # All TypeScript interfaces, enums, business logic functions
└── lib/
    └── utils.ts         # Tailwind merge utility
```

## How to Wire Up the Backend

### 1. Database (Prisma)
- Create a `prisma/schema.prisma` matching the types in `src/types/index.ts`
- Key models: `User`, `Deal`, `DealStatusHistory`, `KpiEntry`, `Draw`, `PointEvent`
- Run `prisma generate` and `prisma migrate dev`

### 2. Services → API Calls
Each file in `src/services/` imports from `src/data/mock-data.ts`.
Replace those imports with real fetch calls:

```typescript
// BEFORE (mock):
import { deals as mockDeals } from '@/data/mock-data';
export async function fetchDeals(filters?: DealFilters) {
  let result = [...mockDeals];
  // ...filter logic...
  return result.map(enrichDeal);
}

// AFTER (API):
export async function fetchDeals(filters?: DealFilters) {
  const params = new URLSearchParams();
  if (filters?.search) params.set('q', filters.search);
  if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
  const res = await fetch(`/api/deals?${params}`);
  return res.json();
}
```

### 3. Authentication
- Add Clerk or NextAuth
- Wrap `<App>` with auth provider
- Add `useAuth()` hook to get current user role
- Use role to conditionally show/hide UI (admin-only buttons, etc.)
- The UI already reflects permission-aware patterns (admin buttons on Points, Draws, Team)

### 4. React Query Hooks
The hooks in `src/hooks/` are already wired to services via React Query.
**No changes needed** — just update the service implementations.

### 5. Forms
- KPI entry form (KPIsPage.tsx) uses React Hook Form + Zod
- Draw request modal (DrawsPage.tsx) has form structure ready
- Points adjustment modal (PointsPage.tsx) has form structure ready
- Deal edit drawer (DealDetail.tsx) has all fields
- Wire `onSubmit` handlers to your mutation hooks

## Business Rules (preserve these)

### Points Calculation (`src/types/index.ts`)
- Base: 2 points per funded deal
- Under $8K fee: reduce base by 1 (= 1 point)
- $10K+ fee: +1 bonus (= 3 total)
- $15K+ fee: +2 bonus (= 4 total)
- $20K+ fee: +3 bonus (= 5 total)
- Bonuses are NOT cumulative — highest tier wins
- TC always gets 0.5 points

### Draw Eligibility (`src/services/draws.service.ts`)
- Deal must be at "Assigned" status or later
- Buyer EMD must be marked as received

## Design System

### Color Tokens (src/index.css)
All colors use HSL CSS variables. Never hardcode colors in components.
- `--primary`, `--success`, `--warning`, `--info`, `--destructive`
- `--gold` for leaderboard/trophy elements
- Sidebar has its own token set (`--sidebar-*`)
- Both light and dark modes are fully themed

### Key Reusable Components
| Component | Props | Usage |
|-----------|-------|-------|
| `MetricCard` | title, value, icon, variant, trend, subtitle | KPI/metric display |
| `DataTable` | columns, data, onRowClick, pageSize | TanStack Table wrapper |
| `StatusBadge` | status, type ('deal'\|'draw') | Color-coded badges |
| `PageHeader` | title, description, children (actions) | Page top section |
| `EmptyState` | icon, title, description, actionLabel | Zero-data states |
| `LoadingState` | variant ('table'\|'cards'\|'detail'\|'page') | Skeleton loaders |
| `ActivityFeed` | items, maxItems | Timeline/event feed |
| `ConfirmDialog` | open, title, description, onConfirm, variant | Destructive actions |

## Routes
| Path | Component | Description |
|------|-----------|-------------|
| `/` | Dashboard | Executive overview |
| `/deals` | DealsPage | Deal pipeline list |
| `/deals/:id` | DealDetail | 7-tab deal detail |
| `/kpis` | KPIsPage | Weekly KPI tracking |
| `/draws` | DrawsPage | Draw management |
| `/points` | PointsPage | Leaderboard + history |
| `/reports` | ReportsPage | 5-tab report center |
| `/team` | TeamPage | User/role management |
| `/settings` | SettingsPage | 6-tab configuration |

## What's NOT Implemented (Cursor TODOs)
- [ ] Real database (Prisma + PostgreSQL)
- [ ] Authentication + RBAC middleware
- [ ] Form submission mutations (all forms log to console)
- [ ] File upload for deal documents
- [ ] Real notification system
- [ ] Reporting period locking
- [ ] Audit log persistence
- [ ] CRM/Aircall/title company integrations
- [ ] Export to CSV/PDF
