import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
// import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock } from 'lucide-react';
import type { UpcomingSession } from '@/types/api.types';

interface UpcomingSessionCardProps {
  session: UpcomingSession;
}

export function UpcomingSessionCardComponent({ session }: UpcomingSessionCardProps) {
  const { title, date, duration, peer, id } = session;
  
  // Calculate day label and time
  const sessionDate = new Date(date);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const sessionDay = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate());
  
  const dayLabel = sessionDay.getTime() === today.getTime() 
    ? 'Today' 
    : sessionDay.getTime() === tomorrow.getTime() 
    ? 'Tomorrow' 
    : sessionDate.toLocaleDateString();
    
  const timeOfDay = sessionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  const href = `/sessions/${id}`;

  return (
    <Link href={href}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold truncate">{title}</h4>

              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{dayLabel}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{timeOfDay}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{duration} min</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={peer.avatar} alt={peer.name} />
                <AvatarFallback>{peer.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">{peer.name}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
