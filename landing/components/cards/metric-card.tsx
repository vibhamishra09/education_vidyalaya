import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon, TrendingUp, Star, Book, BookOpen, Coins, CheckCircle, Users } from 'lucide-react';

export interface MetricCard {
  name: string;
  value: string | number;
  description?: string;
  icon?: string;
}

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
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">{metric.name}</p>
            <p className="text-3xl font-bold mt-1">{metric.value}</p>
            {metric.description && (
              <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
            )}
          </div>
          <div className="ml-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <Icon className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
