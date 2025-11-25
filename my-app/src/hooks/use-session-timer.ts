import { useState, useEffect, useCallback, useRef } from 'react';

interface UseSessionTimerProps {
  startTime: number; // timestamp in milliseconds
  duration: number; // in minutes
  onTimeUp: () => void;
  onWarning: (minutesLeft: number) => void;
  enabled?: boolean;
}

export function useSessionTimer({ startTime, duration, onTimeUp, onWarning, enabled = true }: UseSessionTimerProps) {
  const [timeSpent, setTimeSpent] = useState<number>(0);
  const warningShownRef = useRef(false);
  const timeUpCalledRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled || !isMountedRef.current) {
      return;
    }

    // Reset refs
    warningShownRef.current = false;
    timeUpCalledRef.current = false;

    const calculateTimeSpent = () => {
      const now = Date.now();
      const spent = Math.max(0, now - startTime);
      return spent;
    };

    // Set initial time
    setTimeSpent(calculateTimeSpent());

    // Start interval
    intervalRef.current = setInterval(() => {
      const spent = calculateTimeSpent();
      setTimeSpent(spent);

			const durationMs = duration * 60000;
			const remainingMs = Math.max(0, durationMs - spent);

			// Trigger warning at exactly 5:00 (300 seconds = 300000ms)
			if (remainingMs <= 300000 && remainingMs > 240000 && !warningShownRef.current) {
				warningShownRef.current = true;
				onWarning(5);
			}      // Trigger time up (only once)
      if (remainingMs <= 0 && !timeUpCalledRef.current) {
        timeUpCalledRef.current = true;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        onTimeUp();
      }
    }, 1000);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [startTime, duration, enabled, onTimeUp, onWarning]);

  const formatTime = useCallback(() => {
    const durationMs = duration * 60000;
    const remainingMs = Math.max(0, durationMs - timeSpent);
    const minutes = Math.floor(remainingMs / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [timeSpent, duration]);

  const durationMs = duration * 60000;
  const remainingMs = Math.max(0, durationMs - timeSpent);

  return {
    timeSpent,
    timeRemaining: remainingMs,
    formattedTime: formatTime(),
    minutesLeft: Math.floor(remainingMs / 60000),
  };
}
