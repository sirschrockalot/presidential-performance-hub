import { cn } from '@/lib/utils';
import { DEAL_STATUS_CONFIG, DRAW_STATUS_CONFIG, DealStatus, DrawStatus } from '@/types';

interface StatusBadgeProps {
  status: DealStatus | DrawStatus;
  type?: 'deal' | 'draw';
  className?: string;
}

export function StatusBadge({ status, type = 'deal', className }: StatusBadgeProps) {
  const config = type === 'deal'
    ? DEAL_STATUS_CONFIG[status as DealStatus]
    : DRAW_STATUS_CONFIG[status as DrawStatus];

  if (!config) return null;

  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
      config.color,
      className
    )}>
      {config.label}
    </span>
  );
}
