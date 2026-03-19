import { ActivityItem } from '@/components/shared/ActivityFeed';

export const activityFeed: ActivityItem[] = [
  { id: 'a1', type: 'deal_funded', title: '2100 Cedar Creek Blvd closed', description: 'Andre Davis · $25,000 assignment fee', timestamp: '2026-03-10T14:30:00', link: '/deals/d5' },
  { id: 'a2', type: 'points_awarded', title: 'Points awarded — Andre Davis', description: '5 points for $25,000 funded deal', timestamp: '2026-03-10T14:35:00', link: '/points' },
  { id: 'a3', type: 'draw_requested', title: 'Draw request: Nicole Foster', description: '$1,500 draw on 445 Riverside Dr', timestamp: '2026-03-08T10:00:00', link: '/draws' },
  { id: 'a4', type: 'deal_status', title: 'Deal moved to EMD Received', description: '7890 Sunset Blvd, McKinney TX', timestamp: '2026-03-05T16:00:00', link: '/deals/d7' },
  { id: 'a5', type: 'draw_approved', title: 'Draw approved: Tanya Mitchell', description: '$2,000 draw approved by Marcus', timestamp: '2026-03-05T12:00:00', link: '/draws' },
  { id: 'a6', type: 'kpi_submitted', title: 'KPI entries submitted', description: '4 reps submitted for week of 3/3', timestamp: '2026-03-04T09:00:00', link: '/kpis' },
  { id: 'a7', type: 'deal_created', title: 'New deal: 678 Pecan Grove', description: 'Tanya Mitchell · $98,000 contract', timestamp: '2026-03-10T08:00:00', link: '/deals/d10' },
  { id: 'a8', type: 'deal_funded', title: '567 Pine Valley Rd closed', description: 'Tanya Mitchell · $7,500 fee', timestamp: '2026-03-01T15:00:00', link: '/deals/d4' },
  { id: 'a9', type: 'points_awarded', title: 'Manual adjustment — Andre Davis', description: '+1 bonus point from admin', timestamp: '2026-03-12T11:00:00', link: '/points' },
  { id: 'a10', type: 'deal_status', title: 'Deal moved to Marketed', description: '1200 Heritage Dr, Mesquite TX', timestamp: '2026-03-01T10:00:00', link: '/deals/d8' },
];
