import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import axios from 'axios';

// Using relative path to leverage Next.js rewrites for stability
const API_URL = ''; 

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
      const response = await axios.get(`${API_URL}/api/scratch-pad/history`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data as ScratchPadMetadata[];
    },
    enabled: isLoaded && isSignedIn,
  });
}
