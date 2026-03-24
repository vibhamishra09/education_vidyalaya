import { useAuth } from '@clerk/clerk-expo';
import { usePathname, useRouter } from 'expo-router';
import { useEffect } from 'react';

export function useProtectedRoute(enabled = true, redirectTo?: string) {
  const { isLoaded, isSignedIn } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!enabled || !isLoaded || isSignedIn) {
      return;
    }

    router.replace({
      pathname: '/sign-in',
      params: {
        redirectTo: redirectTo || pathname || '/',
      },
    });
  }, [enabled, isLoaded, isSignedIn, pathname, redirectTo, router]);

  return {
    isAuthLoaded: isLoaded,
    isSignedIn: Boolean(isSignedIn),
    shouldBlock: enabled && (!isLoaded || !isSignedIn),
  };
}
