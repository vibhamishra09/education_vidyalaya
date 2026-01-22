'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Bell, Hand, Users } from 'lucide-react';
import { BuzzerPressedEvent } from '@/types/debate.types';

interface DebateBuzzerProps {
  onPress: () => void;
  isDisabled: boolean;
  isYourTurn: boolean;
  buzzerQueue: BuzzerPressedEvent[];
  currentUserId?: string;
  className?: string;
}

export function DebateBuzzer({
  onPress,
  isDisabled,
  isYourTurn,
  buzzerQueue,
  currentUserId,
  className,
}: DebateBuzzerProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [ripple, setRipple] = useState(false);

  // Check if current user already pressed buzzer
  const userInQueue = buzzerQueue.some((b) => b.participantUserId === currentUserId);
  const userPosition = buzzerQueue.findIndex((b) => b.participantUserId === currentUserId) + 1;

  const handlePress = () => {
    if (isDisabled || userInQueue) return;

    setIsPressed(true);
    setRipple(true);
    onPress();

    // Reset animations
    setTimeout(() => {
      setIsPressed(false);
      setRipple(false);
    }, 300);
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-4 space-y-4">
        {/* Buzzer Button */}
        <div className="flex justify-center">
          <div className="relative">
            {/* Ripple effect */}
            {ripple && (
              <div className="absolute inset-0 rounded-full animate-ping bg-yellow-500/50" />
            )}

            <Button
              onClick={handlePress}
              disabled={isDisabled || userInQueue}
              size="lg"
              className={cn(
                'relative h-24 w-24 rounded-full transition-all duration-200',
                isPressed && 'scale-95',
                isYourTurn
                  ? 'bg-green-500 hover:bg-green-600'
                  : userInQueue
                  ? 'bg-yellow-500 hover:bg-yellow-600'
                  : 'bg-red-500 hover:bg-red-600'
              )}
            >
              <div className="flex flex-col items-center">
                {userInQueue ? (
                  <>
                    <Hand className="h-8 w-8 mb-1" />
                    <span className="text-xs">#{userPosition}</span>
                  </>
                ) : (
                  <>
                    <Bell className="h-8 w-8 mb-1" />
                    <span className="text-xs">BUZZER</span>
                  </>
                )}
              </div>
            </Button>
          </div>
        </div>

        {/* Status Text */}
        <div className="text-center">
          {isYourTurn ? (
            <p className="text-green-600 font-medium">It&apos;s your turn to speak!</p>
          ) : userInQueue ? (
            <p className="text-yellow-600">
              You are #{userPosition} in the queue
            </p>
          ) : isDisabled ? (
            <p className="text-muted-foreground">Buzzer disabled</p>
          ) : (
            <p className="text-muted-foreground">Press to request speaking turn</p>
          )}
        </div>

        {/* Buzzer Queue */}
        {buzzerQueue.length > 0 && (
          <div className="border-t pt-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Users className="h-4 w-4" />
              <span>Queue ({buzzerQueue.length})</span>
            </div>
            <div className="space-y-1">
              {buzzerQueue.slice(0, 5).map((item, index) => (
                <div
                  key={item.participantId}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded text-sm',
                    item.participantUserId === currentUserId && 'bg-primary/10'
                  )}
                >
                  <span className="text-muted-foreground">#{index + 1}</span>
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full',
                      item.side === 'FOR' ? 'bg-green-500' : 'bg-red-500'
                    )}
                  />
                  <span className="truncate flex-1">{item.participantName}</span>
                  {item.participantUserId === currentUserId && (
                    <span className="text-xs text-primary">(You)</span>
                  )}
                </div>
              ))}
              {buzzerQueue.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{buzzerQueue.length - 5} more
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Compact buzzer for mobile/sidebar
interface CompactBuzzerProps {
  onPress: () => void;
  isDisabled: boolean;
  isInQueue: boolean;
  queuePosition?: number;
}

export function CompactBuzzer({
  onPress,
  isDisabled,
  isInQueue,
  queuePosition,
}: CompactBuzzerProps) {
  return (
    <Button
      onClick={onPress}
      disabled={isDisabled || isInQueue}
      size="lg"
      className={cn(
        'w-full',
        isInQueue
          ? 'bg-yellow-500 hover:bg-yellow-600'
          : 'bg-red-500 hover:bg-red-600'
      )}
    >
      {isInQueue ? (
        <>
          <Hand className="h-4 w-4 mr-2" />
          In Queue #{queuePosition}
        </>
      ) : (
        <>
          <Bell className="h-4 w-4 mr-2" />
          Press Buzzer
        </>
      )}
    </Button>
  );
}
