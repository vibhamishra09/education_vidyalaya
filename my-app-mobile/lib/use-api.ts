import { useAuth } from '@clerk/clerk-expo';
import { useCallback, useEffect, useRef } from 'react';
import { ApiError, apiRequest } from './api';

type RequestOptions = {
  auth?: boolean;
};

export function useApi() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const request = useCallback(
    async <T>(
      path: string,
      init?: RequestInit,
      options: RequestOptions = { auth: false },
    ) => {
      const token = options.auth ? await getTokenRef.current() : null;
      if (options.auth && !token) {
        throw new ApiError('Please sign in to continue.', 401, null);
      }
      return apiRequest<T>(path, init, token);
    },
    [],
  );

  return { request };
}
