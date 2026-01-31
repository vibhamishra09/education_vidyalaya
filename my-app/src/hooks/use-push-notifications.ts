import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  isPushNotificationSupported,
  getNotificationPermissionStatus,
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getCurrentPushSubscription,
} from '@/lib/utils/push-notifications';
import apiClient from '@/lib/api-client';

interface UsePushNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  checkSubscription: () => Promise<void>;
}

// Helper function to add timeout to promises
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

// Helper function to retry a promise with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  initialDelayMs: number,
  errorMessage: string
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // console.log(`⚠️ Attempt ${attempt + 1}/${maxRetries + 1} failed:`, lastError.message);
      
      if (attempt < maxRetries) {
        const delay = initialDelayMs * Math.pow(2, attempt);
        // console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(errorMessage);
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [isSupported] = useState(() => isPushNotificationSupported());
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check initial subscription status
  const checkSubscription = useCallback(async () => {
    // console.log('🔍 Checking subscription status...');
    if (!isSupported) {
      // console.log('❌ Push notifications not supported');
      return;
    }

    try {
      const subscription = await getCurrentPushSubscription();
      const hasSubscription = subscription !== null;
      setIsSubscribed(hasSubscription);
      // console.log('✅ Subscription check complete:', hasSubscription ? 'Subscribed' : 'Not subscribed');
    } catch (err) {
      // console.error('❌ Error checking subscription:', err);
      setIsSubscribed(false);
    }
  }, [isSupported]);

  // Update permission status
  useEffect(() => {
    if (!isSupported) return;

    const updatePermission = () => {
      const currentPermission = getNotificationPermissionStatus();
      setPermission(currentPermission);
      // console.log('🔔 Permission status:', currentPermission);
    };

    updatePermission();

    // Listen for permission changes
    const interval = setInterval(updatePermission, 1000);
    return () => clearInterval(interval);
  }, [isSupported]);

  // Check subscription on mount and when permission changes
  useEffect(() => {
    if (permission === 'granted') {
      checkSubscription();
    } else {
      setIsSubscribed(false);
    }
  }, [permission, checkSubscription]);

  const handleSubscribe = useCallback(async (): Promise<boolean> => {
    // console.log('🚀 Starting subscription process...');
    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Check authentication
      // console.log('🔐 Checking authentication...');
      if (!isLoaded) {
        throw new Error('Authentication not loaded yet. Please wait a moment.');
      }
      if (!isSignedIn) {
        throw new Error('You must be signed in to enable notifications.');
      }
      // console.log('✅ User is authenticated');

      // Step 2: Request notification permission
      // console.log('🔔 Requesting notification permission...');
      const permissionResult = await withTimeout(
        requestNotificationPermission(),
        120000, // 120 second timeout (2 minutes)
        'Permission request timed out. Please try again.'
      );
      
      setPermission(permissionResult);
      // console.log('✅ Permission result:', permissionResult);

      if (permissionResult !== 'granted') {
        throw new Error('Notification permission denied. Please enable notifications in your browser settings.');
      }

      // Step 3: Get authentication token
      // console.log('🔑 Getting authentication token...');
      const token = await withTimeout(
        getToken(),
        10000, // 10 second timeout
        'Failed to get authentication token. Please try signing in again.'
      );
      
      if (!token) {
        throw new Error('Authentication token not available. Please sign in again.');
      }
      // console.log('✅ Auth token obtained');

      // Step 4: Get VAPID public key from backend (with retry for mobile networks)
      // console.log('🔑 Fetching VAPID public key...');
      const vapidResponse = await withRetry(
        () => withTimeout(
          apiClient.get<{ publicKey: string }>('/api/notifications/vapid-public-key', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          20000, // 20 second timeout (increased for mobile)
          'Server request timed out'
        ),
        2, // 2 retries (3 total attempts)
        1000, // 1 second initial delay
        'Failed to fetch VAPID key. Please check your internet connection and try again.'
      );
      
      const vapidPublicKey = vapidResponse.data.publicKey;
      
      if (!vapidPublicKey) {
        throw new Error('VAPID key not configured on server. Please contact support.');
      }
      
      // console.log('✅ VAPID public key received:', vapidPublicKey.substring(0, 20) + '...');

      // Step 5: Subscribe to push notifications
      // console.log('📡 Subscribing to push manager...');
      const subscription = await withTimeout(
        subscribeToPushNotifications(vapidPublicKey),
        15000, // 15 second timeout
        'Failed to create push subscription. Please check your browser settings.'
      );
      
      if (!subscription) {
        throw new Error('Failed to create push subscription. Please try again.');
      }
      // console.log('✅ Push subscription created');

      // Step 6: Send subscription to backend (with retry for mobile networks)
      // console.log('💾 Sending subscription to backend...');
      await withRetry(
        () => withTimeout(
          apiClient.post(
            '/api/notifications/push/subscribe',
            { subscription: subscription.toJSON() },
            { headers: { Authorization: `Bearer ${token}` } }
          ),
          20000, // 20 second timeout (increased for mobile)
          'Server request timed out'
        ),
        2, // 2 retries (3 total attempts)
        1000, // 1 second initial delay
        'Failed to save subscription to server. Please check your connection and try again.'
      );
      
      // console.log('✅ Subscription saved to backend');

      setIsSubscribed(true);
      setError(null);
      // console.log('🎉 Successfully subscribed to push notifications!');
      return true;
    } catch (err: unknown) {
      // console.error('❌ Subscription error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to enable notifications. Please try again.';
      setError(errorMessage);
      setIsSubscribed(false);
      return false;
    } finally {
      setIsLoading(false);
      // console.log('🏁 Subscription process complete');
    }
  }, [getToken, isLoaded, isSignedIn]);

  const handleUnsubscribe = useCallback(async (): Promise<boolean> => {
    // console.log('🔕 Starting unsubscribe process...');
    setIsLoading(true);
    setError(null);

    try {
      // Check authentication
      if (!isLoaded || !isSignedIn) {
        throw new Error('You must be signed in');
      }

      // Get token
      const token = await withTimeout(
        getToken(),
        10000,
        'Failed to get authentication token'
      );
      
      if (!token) {
        throw new Error('Authentication token not available');
      }

      // Unsubscribe from push notifications
      // console.log('📡 Unsubscribing from push manager...');
      const unsubscribed = await withTimeout(
        unsubscribeFromPushNotifications(),
        10000,
        'Failed to unsubscribe from push notifications'
      );
      
      if (!unsubscribed) {
        throw new Error('Failed to unsubscribe');
      }

      // Notify backend
      // console.log('💾 Notifying backend...');
      await withTimeout(
        apiClient.post(
          '/api/notifications/push/unsubscribe',
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        10000,
        'Failed to notify server about unsubscription'
      );

      setIsSubscribed(false);
      setError(null);
      // console.log('✅ Successfully unsubscribed from push notifications');
      return true;
    } catch (err: unknown) {
      // console.error('❌ Unsubscribe error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to disable notifications';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe: handleSubscribe,
    unsubscribe: handleUnsubscribe,
    checkSubscription,
  };
}
