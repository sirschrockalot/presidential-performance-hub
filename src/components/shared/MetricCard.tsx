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

const variantStyles = {
  default: 'border-border',
  success: 'border-l-4 border-l-success border-t-0 border-r-0 border-b-0',
  warning: 'border-l-4 border-l-warning border-t-0 border-r-0 border-b-0',
  info: 'border-l-4 border-l-info border-t-0 border-r-0 border-b-0',
};

export function MetricCard({ title, value, subtitle, icon: Icon, trend, className, variant = 'default' }: MetricCardProps) {
  return (
    <div className={cn(
      'rounded-lg border bg-card p-5 animate-fade-in',
      variantStyles[variant],
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight text-card-foreground">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          {trend && (
            <p className={cn('text-xs font-medium', trend.value >= 0 ? 'text-success' : 'text-destructive')}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        {Icon && (
          <div className="rounded-md bg-muted p-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}
