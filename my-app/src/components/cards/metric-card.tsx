import { LucideIcon, TrendingUp, Star, Book, BookOpen, Coins, CheckCircle, Users } from 'lucide-react';
import type { MetricCard } from '@/types';

interface MetricCardProps {
  metric: MetricCard;
}

const iconMap: Record<string, LucideIcon> = {
  'trending-up': TrendingUp,
  'star': Star,
  'book': Book,
  'book-open': BookOpen,
  'coins': Coins,
  'check-circle': CheckCircle,
  'users': Users,
};

export function MetricCardComponent({ metric }: MetricCardProps) {
  const Icon = metric.icon ? iconMap[metric.icon] || TrendingUp : TrendingUp;

  return (
    <div className="relative group w-full overflow-hidden rounded-[24px] bg-white dark:bg-card border border-border/40 p-6 transition-all duration-300 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5">
      
      <div className="flex items-center justify-between">
        
        {/* Left Side: Text Information */}
        <div className="flex flex-col space-y-1">
          {/* Label: Uppercase & Muted (Matches "LEARNERS") */}
          <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase whitespace-nowrap">
            {metric.name}
          </span>
          
          {/* Value: Large & Bold (Matches "145") */}
          <span className="text-4xl font-bold text-foreground tracking-tight">
            {metric.value}
          </span>

          {/* Description (Optional) */}
          {metric.description && (
            <p className="text-xs text-muted-foreground/60 font-medium pt-1">
              {metric.description}
            </p>
          )}
        </div>

        {/* Right Side: Circular Icon */}
        <div className="shrink-0">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
            <Icon className="h-8 w-8 text-primary" strokeWidth={2.5} />
          </div>
        </div>

      </div>
    </div>
  );
}