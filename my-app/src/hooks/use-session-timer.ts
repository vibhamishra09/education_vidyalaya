import { useState, useEffect, useCallback, useRef } from 'react';

interface UseSessionTimerProps {
  startTime: number; // timestamp in milliseconds
  duration: number; // in minutes
  onTimeUp: () => void;
  onWarning: (minutesLeft: number) => void;
  enabled?: boolean;
  extendedEndTime?: number | null; // Optional extended end time from socket
}

export function useSessionTimer({ startTime, duration, onTimeUp, onWarning, enabled = true, extendedEndTime }: UseSessionTimerProps) {
  const [timeSpent, setTimeSpent] = useState<number>(0);
  const [currentDuration, setCurrentDuration] = useState<number>(duration);
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

  // Update duration when session is extended
  useEffect(() => {
    if (extendedEndTime && startTime) {
      const newDurationMs = extendedEndTime - startTime;
      const newDurationMinutes = Math.ceil(newDurationMs / 60000);
      setCurrentDuration(newDurationMinutes);
      // Reset warning flag so warning can show again if needed
      warningShownRef.current = false;
    }
  }, [extendedEndTime, startTime]);

  // Reset duration when initial duration changes
  useEffect(() => {
    if (!extendedEndTime) {
      setCurrentDuration(duration);
    }
  }, [duration, extendedEndTime]);

  useEffect(() => {
    if (!enabled || !isMountedRef.current) {
      return;
    }

    // Reset refs when enabled changes
    if (!extendedEndTime) {
      warningShownRef.current = false;
    }
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

			const durationMs = currentDuration * 60000;
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
  }, [startTime, currentDuration, enabled, onTimeUp, onWarning, extendedEndTime]);

  const formatTime = useCallback(() => {
    const durationMs = currentDuration * 60000;
    const remainingMs = Math.max(0, durationMs - timeSpent);
    const minutes = Math.floor(remainingMs / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [timeSpent, currentDuration]);

  const durationMs = currentDuration * 60000;
  const remainingMs = Math.max(0, durationMs - timeSpent);

  // Calculate current end time for extension purposes
  const currentEndTime = startTime + (currentDuration * 60000);

  return {
    timeSpent,
    timeRemaining: remainingMs,
    formattedTime: formatTime(),
    minutesLeft: Math.floor(remainingMs / 60000),
    currentDuration,
    currentEndTime,
  };
}
