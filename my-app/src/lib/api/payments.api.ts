import apiClient from '../api-client';
import { TransactionHistoryResponse } from '@/types/api.types';
import { cleanQueryParams } from '../utils/api-utils';

export const paymentsApi = {
  // Get transaction history
  getTransactionHistory: async (page?: number, limit?: number): Promise<TransactionHistoryResponse> => {
    const params = cleanQueryParams({ page, limit });
    const response = await apiClient.get<TransactionHistoryResponse>('/api/payments/history', { params });
    return response.data;
  },
};

