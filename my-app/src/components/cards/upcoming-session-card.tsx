import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
// import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock } from 'lucide-react';
import type { UpcomingSession } from '@/types/api.types';
import { getRelativeTimeString } from '@/lib/utils/date-time';

interface UpcomingSessionCardProps {
  session: UpcomingSession;
}

export function UpcomingSessionCardComponent({ session }: UpcomingSessionCardProps) {
  const { title, date, duration, peer, id } = session;

  // Get timezone-aware formatted time
  const sessionTime = getRelativeTimeString(date);
  
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
                  <span className="font-medium">{sessionTime}</span>
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
