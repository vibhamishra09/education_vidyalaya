'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Clock, AlertTriangle } from 'lucide-react';

interface DebateTurnTimerProps {
  turnDurationSeconds: number;
  turnStartedAt: string | null;
  isActive: boolean;
  speakerName?: string;
  speakerSide?: 'FOR' | 'AGAINST';
  onTimeUp?: () => void;
  className?: string;
}

export function DebateTurnTimer({
  turnDurationSeconds,
  turnStartedAt,
  isActive,
  speakerName,
  speakerSide,
  onTimeUp,
  className,
}: DebateTurnTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(turnDurationSeconds);
  const [hasCalledTimeUp, setHasCalledTimeUp] = useState(false);

  useEffect(() => {
    if (!isActive || !turnStartedAt) {
      setTimeRemaining(turnDurationSeconds);
      setHasCalledTimeUp(false);
      return;
    }

    const startTime = new Date(turnStartedAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      const remaining = Math.max(0, turnDurationSeconds - elapsed);
      setTimeRemaining(remaining);

      if (remaining === 0 && !hasCalledTimeUp) {
        setHasCalledTimeUp(true);
        onTimeUp?.();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [turnStartedAt, turnDurationSeconds, isActive, onTimeUp, hasCalledTimeUp]);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  const progress = (timeRemaining / turnDurationSeconds) * 100;
  const isWarning = timeRemaining <= 30 && timeRemaining > 10;
  const isCritical = timeRemaining <= 10;

  return (
    <Card
      className={cn(
        'overflow-hidden transition-all',
        isActive && 'ring-2 ring-primary',
        className
      )}
    >
      <CardContent className="p-4">
        {/* Speaker Info */}
        {speakerName && (
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-3 h-3 rounded-full',
                  speakerSide === 'FOR' ? 'bg-green-500' : 'bg-red-500'
                )}
              />
              <span className="font-medium">{speakerName}</span>
            </div>
            <span
              className={cn(
                'text-xs font-medium px-2 py-1 rounded',
                speakerSide === 'FOR'
                  ? 'bg-green-500/10 text-green-600'
                  : 'bg-red-500/10 text-red-600'
              )}
            >
              {speakerSide}
            </span>
          </div>
        )}

        {/* Timer Display */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <Clock
            className={cn(
              'w-6 h-6',
              isCritical && 'text-red-500 animate-pulse',
              isWarning && 'text-yellow-500'
            )}
          />
          <span
            className={cn(
              'text-4xl font-mono font-bold tabular-nums',
              isCritical && 'text-red-500',
              isWarning && 'text-yellow-500'
            )}
          >
            {formattedTime}
          </span>
          {isCritical && (
            <AlertTriangle className="w-6 h-6 text-red-500 animate-bounce" />
          )}
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-1000 ease-linear',
              isCritical && 'bg-red-500',
              isWarning && 'bg-yellow-500',
              !isCritical && !isWarning && 'bg-primary'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Status */}
        {!isActive && (
          <p className="text-center text-sm text-muted-foreground mt-2">
            Waiting for turn...
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Prep phase countdown
interface PrepCountdownProps {
  secondsRemaining: number;
  className?: string;
}

export function PrepCountdown({ secondsRemaining, className }: PrepCountdownProps) {
  return (
    <Card className={cn('bg-yellow-500/10 border-yellow-500/30', className)}>
      <CardContent className="p-6 text-center">
        <div className="text-yellow-600 font-medium mb-2">
          Preparation Time
        </div>
        <div className="text-6xl font-mono font-bold text-yellow-600 tabular-nums">
          {secondsRemaining}
        </div>
        <p className="text-sm text-yellow-600/80 mt-2">
          Discuss strategy with your team
        </p>
      </CardContent>
    </Card>
  );
}

// Simple time display for header
interface SimpleTimerProps {
  turnDurationSeconds: number;
  turnStartedAt: string | null;
  isActive: boolean;
}

export function SimpleTimer({
  turnDurationSeconds,
  turnStartedAt,
  isActive,
}: SimpleTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(turnDurationSeconds);

  useEffect(() => {
    if (!isActive || !turnStartedAt) {
      setTimeRemaining(turnDurationSeconds);
      return;
    }

    const startTime = new Date(turnStartedAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      const remaining = Math.max(0, turnDurationSeconds - elapsed);
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [turnStartedAt, turnDurationSeconds, isActive]);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  const isWarning = timeRemaining <= 30 && timeRemaining > 10;
  const isCritical = timeRemaining <= 10;

  return (
    <span
      className={cn(
        'font-mono font-bold tabular-nums',
        isCritical && 'text-red-500',
        isWarning && 'text-yellow-500'
      )}
    >
      {formattedTime}
    </span>
  );
}
