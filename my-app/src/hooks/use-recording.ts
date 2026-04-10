import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

export interface Recording {
  id: string;
  egressId: string;
  roomId: string;
  url: string | null;
  status: string;
  duration: number | null;
  estimatedCost: string | null;
  autoDeleteAt: string | null;
  createdAt: string;
  room?: {
    title: string;
  };
}

interface UseRecordingProps {
  roomId: string;
}

export function useRecording({ roomId }: UseRecordingProps) {
  const { getToken } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoomRecordings = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await fetch(`/api/recording/${roomId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRecordings(data);
      }
    } catch (err) {
      console.error('Failed to fetch recordings:', err);
    }
  }, [roomId, getToken]);

  const startRecording = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const response = await fetch('/api/recording/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ roomId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to start recording');
      }

      setIsRecording(true);
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [roomId, getToken]);

  const stopRecording = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const response = await fetch('/api/recording/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ roomId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to stop recording');
      }

      setIsRecording(false);
      fetchRoomRecordings();
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop recording');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [roomId, getToken, fetchRoomRecordings]);

  return {
    isRecording,
    recordings,
    loading,
    error,
    startRecording,
    stopRecording,
    fetchRoomRecordings,
  };
}
