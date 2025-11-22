import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Clock, Loader2 } from 'lucide-react';
import type { PendingRequest } from '@/types/api.types';

interface SessionRequestCardProps {
  request: PendingRequest;
  onAccept?: () => void;
  onDecline?: () => void;
  isProcessing?: boolean;
}

export function SessionRequestCard({ request, onAccept, onDecline, isProcessing = false }: SessionRequestCardProps) {
  const { requestedBy, skills, date, duration, title } = request;

  // Calculate time remaining
  const sessionDate = new Date(date);
  const now = new Date();
  const timeDiff = sessionDate.getTime() - now.getTime();
  const days = Math.ceil(timeDiff / (1000 * 3600 * 24));
  
  const timeRemaining = days > 0 
    ? `${days} day${days > 1 ? 's' : ''} remaining`
    : 'Session time passed';

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={requestedBy?.avatar} alt={requestedBy?.name} />
            <AvatarFallback>{requestedBy?.name?.charAt(0)}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h4 className="font-semibold">{title}</h4>
            <p className="text-sm text-muted-foreground">Requested by {requestedBy.name}</p>
            <div className="flex items-center gap-2 mt-2">
              {skills.map((skill, index) => (
                <Badge key={index} variant="secondary">{skill}</Badge>
              ))}
            </div>

            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{timeRemaining}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{duration} min</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onDecline}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            'Decline'
          )}
        </Button>
        <Button
          className="flex-1"
          onClick={onAccept}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            'Accept'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
