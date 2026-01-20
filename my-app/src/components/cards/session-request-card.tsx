import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Clock, Loader2, Calendar } from 'lucide-react';
import type { PendingRequest } from '@/types/api.types';
import { getDaysUntil, getRelativeTimeString } from '@/lib/utils/date-time';

interface SessionRequestCardProps {
  request: PendingRequest;
  onAccept?: () => void;
  onDecline?: () => void;
  isProcessing?: boolean;
  variant?: 'received' | 'sent';
}

export function SessionRequestCard({
  request,
  onAccept,
  onDecline,
  isProcessing = false,
  variant = 'received',
}: SessionRequestCardProps) {
  const { requestedBy, requestedTo, skills = [], date, duration, title } = request;
  const counterpart = variant === 'received' ? requestedBy : requestedTo ?? requestedBy;

  // Check if session has passed (compare actual datetime, not just date)
  const sessionDate = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const hasSessionPassed = sessionDate.getTime() < now.getTime();

  // Calculate time remaining using timezone-aware utilities
  const days = getDaysUntil(date);

  const timeRemaining = hasSessionPassed
    ? 'Session time passed'
    : days > 0
    ? `${days} day${days > 1 ? 's' : ''} remaining`
    : 'Today';

  // Get formatted date/time in user's timezone
  const sessionTime = getRelativeTimeString(date);

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={counterpart?.avatar} alt={counterpart?.name} />
            <AvatarFallback>{counterpart?.name?.charAt(0)}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h4 className="font-semibold">{title}</h4>
            <p className="text-sm text-muted-foreground">
              {variant === 'received'
                ? `Requested by ${counterpart?.name}`
                : `Awaiting ${counterpart?.name}'s response`}
            </p>
            <div className="flex items-center gap-2 mt-2">
              {skills.map((skill, index) => (
                <Badge key={index} variant="secondary">{skill}</Badge>
              ))}
            </div>

            <div className="flex flex-col gap-2 mt-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">{sessionTime}</span>
              </div>
              <div className="flex items-center gap-4">
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
        </div>
      </CardContent>

      {variant === 'received' ? (
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
      ) : (
        <CardFooter className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Status</span>
          <Badge variant="secondary" className="uppercase tracking-wide">
            Pending
          </Badge>
        </CardFooter>
      )}
    </Card>
  );
}
