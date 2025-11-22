import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { paymentsApi } from '@/lib/api';
import { setAuthToken } from '@/lib/api-client';

export function useTransactionHistory() {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      if (!isSignedIn) {
        return { transactions: [] };
      }

      const token = await getToken();
      if (token) {
        setAuthToken(token);
      }

      return paymentsApi.getTransactionHistory();
    },
    enabled: isSignedIn,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
