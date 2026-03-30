import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface ScratchPadMetadata {
  roomId: string;
  roomTitle: string;
  lastUpdated: string;
  isHost: boolean;
}

export function useScratchPadHistory() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  return useQuery({
    queryKey: ['scratch-pad-history'],
    queryFn: async () => {
      const token = await getToken();
      const response = await axios.get(`${API_URL}/scratch-pad/history`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data as ScratchPadMetadata[];
    },
    enabled: isLoaded && isSignedIn,
  });
}
