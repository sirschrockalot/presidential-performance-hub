import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: { value: number; label: string };
  className?: string;
  variant?: 'default' | 'success' | 'warning' | 'info';
}

const variantIcon = {
  default: 'bg-muted text-muted-foreground',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  info: 'bg-info/10 text-info',
};

const variantBorder = {
  default: '',
  success: 'border-l-2 border-l-success',
  warning: 'border-l-2 border-l-warning',
  info: 'border-l-2 border-l-info',
};

export function MetricCard({ title, value, subtitle, icon: Icon, trend, className, variant = 'default' }: MetricCardProps) {
  return (
    <div className={cn(
      'rounded-lg border bg-card p-4 transition-colors hover:border-border/80',
      variantBorder[variant],
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold tracking-tight text-card-foreground truncate">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          {trend && (
            <p className={cn('text-xs font-medium', trend.value >= 0 ? 'text-success' : 'text-destructive')}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn('rounded-lg p-2 shrink-0', variantIcon[variant])}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
    </div>
  );
}
