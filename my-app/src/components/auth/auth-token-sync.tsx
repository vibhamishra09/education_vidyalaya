'use client';

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { setAuthToken, clearAuthToken } from '@/lib/api-client';

/**
 * Sets the Clerk JWT in axios defaults as early as possible when Clerk loads.
 * This avoids the serial getToken() → API call waterfall inside each queryFn.
 * Renders nothing — purely a side-effect component.
 */
export function AuthTokenSync() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      getToken().then((token) => {
        if (token) setAuthToken(token);
      });
    } else {
      clearAuthToken();
    }
  }, [isLoaded, isSignedIn, getToken]);

  return null;
}
