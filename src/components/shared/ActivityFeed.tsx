import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Handshake, Trophy, Banknote, BarChart3, UserPlus, AlertTriangle, CheckCircle } from 'lucide-react';

export interface ActivityItem {
  id: string;
  type: 'deal_created' | 'deal_funded' | 'deal_status' | 'draw_requested' | 'draw_approved' | 'points_awarded' | 'kpi_submitted' | 'user_joined';
  title: string;
  description: string;
  timestamp: string;
  link?: string;
  actor?: string;
}

const typeConfig: Record<ActivityItem['type'], { icon: typeof Handshake; color: string }> = {
  deal_created: { icon: Handshake, color: 'text-info bg-info/10' },
  deal_funded: { icon: CheckCircle, color: 'text-success bg-success/10' },
  deal_status: { icon: Handshake, color: 'text-primary bg-primary/10' },
  draw_requested: { icon: Banknote, color: 'text-warning bg-warning/10' },
  draw_approved: { icon: Banknote, color: 'text-success bg-success/10' },
  points_awarded: { icon: Trophy, color: 'text-gold bg-gold/10' },
  kpi_submitted: { icon: BarChart3, color: 'text-info bg-info/10' },
  user_joined: { icon: UserPlus, color: 'text-primary bg-primary/10' },
};

interface ActivityFeedProps {
  items: ActivityItem[];
  className?: string;
  maxItems?: number;
}

export function ActivityFeed({ items, className, maxItems = 8 }: ActivityFeedProps) {
  const displayed = items.slice(0, maxItems);

  return (
    <div className={cn('space-y-1', className)}>
      {displayed.map((item) => {
        const config = typeConfig[item.type];
        const Icon = config.icon;
        const Wrapper = item.link ? Link : 'div';
        const wrapperProps = item.link ? { to: item.link } : {};

        return (
          <Wrapper
            key={item.id}
            {...(wrapperProps as any)}
            className={cn(
              'flex items-start gap-3 py-2.5 px-3 rounded-md transition-colors',
              item.link && 'hover:bg-muted/50 cursor-pointer group'
            )}
          >
            <div className={cn('rounded-md p-1.5 mt-0.5 shrink-0', config.color)}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                {item.title}
              </p>
              <p className="text-xs text-muted-foreground truncate">{item.description}</p>
            </div>
            <span className="text-[11px] text-muted-foreground whitespace-nowrap mt-0.5">
              {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
            </span>
          </Wrapper>
        );
      })}
    </div>
  );
}
