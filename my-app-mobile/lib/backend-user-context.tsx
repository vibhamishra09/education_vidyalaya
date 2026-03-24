import { useAuth, useUser } from '@clerk/clerk-expo';
import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { apiRequest, getErrorMessage } from './api';

type BackendUserContextValue = {
  ready: boolean;
  loading: boolean;
  error: string | null;
  isAuthLoaded: boolean;
  isSignedIn: boolean;
  refresh: () => Promise<void>;
};

type ClerkBootstrapUser = {
  firstName?: string | null;
  id: string;
  imageUrl?: string | null;
  lastName?: string | null;
  primaryEmailAddress?: {
    emailAddress?: string | null;
  } | null;
  username?: string | null;
};

const BackendUserContext = createContext<BackendUserContextValue | null>(null);

function buildOnboardingPayload(user: ClerkBootstrapUser) {
  const primaryEmail = user.primaryEmailAddress?.emailAddress;

  return {
    name:
      [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
      user.username ||
      primaryEmail ||
      'Webyalaya User',
    email: primaryEmail || `${user.id}@webyalaya.local`,
    avatar: user.imageUrl,
    bio: '',
    location: '',
    school: '',
    hourlyRate: 0,
    skillsIHave: [],
    skillsIWant: [],
  };
}

export function BackendUserProvider({ children }: PropsWithChildren) {
  const { getToken, isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { isLoaded: isUserLoaded, user } = useUser();
  const bootstrappedUserRef = useRef<string | null>(null);
  const attemptedUserRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bootstrapUser = useCallback(async (force = false) => {
    if (!isSignedIn || !user) {
      bootstrappedUserRef.current = null;
      attemptedUserRef.current = null;
      setError(null);
      setLoading(false);
      return;
    }

    if (!force && attemptedUserRef.current === user.id) {
      return;
    }

    attemptedUserRef.current = user.id;
    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available.');
      }

      await apiRequest(
        '/api/users/onboarding',
        {
          method: 'POST',
          body: JSON.stringify(buildOnboardingPayload(user)),
        },
        token,
      );

      bootstrappedUserRef.current = user.id;
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to prepare your backend profile.'));
    } finally {
      setLoading(false);
    }
  }, [getToken, isSignedIn, user]);

  const refresh = useCallback(async () => {
    attemptedUserRef.current = null;
    await bootstrapUser(true);
  }, [bootstrapUser]);

  useEffect(() => {
    if (!isAuthLoaded || !isUserLoaded) {
      return;
    }

    if (!isSignedIn || !user) {
      bootstrappedUserRef.current = null;
      attemptedUserRef.current = null;
      setLoading(false);
      setError(null);
      return;
    }

    if (
      bootstrappedUserRef.current === user.id ||
      attemptedUserRef.current === user.id ||
      loading
    ) {
      return;
    }

    void bootstrapUser();
  }, [bootstrapUser, isAuthLoaded, isSignedIn, isUserLoaded, loading, user]);

  const value = useMemo<BackendUserContextValue>(
    () => ({
      ready:
        isAuthLoaded &&
        isUserLoaded &&
        isSignedIn &&
        bootstrappedUserRef.current === user?.id &&
        !loading,
      loading,
      error,
      isAuthLoaded: isAuthLoaded && isUserLoaded,
      isSignedIn: Boolean(isSignedIn),
      refresh,
    }),
    [error, isAuthLoaded, isSignedIn, isUserLoaded, loading, refresh, user?.id],
  );

  return (
    <BackendUserContext.Provider value={value}>
      {children}
    </BackendUserContext.Provider>
  );
}

export function useBackendUser() {
  const context = useContext(BackendUserContext);

  if (!context) {
    throw new Error('useBackendUser must be used within BackendUserProvider');
  }

  return context;
}
