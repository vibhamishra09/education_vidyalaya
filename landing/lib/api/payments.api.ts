// Stub API for static build
export const paymentsApi = {
  getTransactionHistory: async () => ({
    transactions: [],
    pagination: { total: 0, page: 1, limit: 20, totalPages: 0, hasMore: false },
  }),
};
