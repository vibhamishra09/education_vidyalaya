import { useState, useEffect, useCallback } from 'react';
import { notificationsApi } from '@/lib/api';
import {
  isPushNotificationSupported,
  hasNotificationPermission,
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getCurrentPushSubscription,
  getNotificationPermissionStatus,
} from '@/lib/utils/push-notifications';

interface UsePushNotificationsResult {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  requestPermission: () => Promise<boolean>;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
}

export function usePushNotifications(): UsePushNotificationsResult {
  const [isSupported] = useState(() => isPushNotificationSupported());
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check initial permission and subscription status
  useEffect(() => {
    const checkStatus = async () => {
      if (!isSupported) {
        return;
      }

      const currentPermission = getNotificationPermissionStatus();
      setPermission(currentPermission);

      if (currentPermission === 'granted') {
        try {
          const subscription = await getCurrentPushSubscription();
          setIsSubscribed(!!subscription);
        } catch (error) {
          console.error('Error checking subscription status:', error);
          setIsSubscribed(false);
        }
      } else {
        setIsSubscribed(false);
      }
    };

    checkStatus();
  }, [isSupported]);

  // Request notification permission
  const handleRequestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Push notifications are not supported in this browser');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const permissionResult = await requestNotificationPermission();
      setPermission(permissionResult);

      if (permissionResult === 'granted') {
        return true;
      } else if (permissionResult === 'denied') {
        setError('Notification permission denied. Please enable it in your browser settings.');
        return false;
      } else {
        setError('Notification permission request dismissed.');
        return false;
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      setError('Failed to request notification permission');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  // Subscribe to push notifications
  const handleSubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Push notifications are not supported');
      return false;
    }

    if (!hasNotificationPermission()) {
      const granted = await handleRequestPermission();
      if (!granted) {
        return false;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get VAPID public key from backend
      const { publicKey } = await notificationsApi.getVapidPublicKey();

      if (!publicKey) {
        throw new Error('Failed to get VAPID public key from server');
      }

      // Subscribe to push notifications
      const subscription = await subscribeToPushNotifications(publicKey);

      if (!subscription) {
        throw new Error('Failed to create push subscription');
      }

      // Send subscription to backend
      const subscriptionJSON = subscription.toJSON();
      const result = await notificationsApi.subscribeToPush(subscriptionJSON);

      if (result.success) {
        setIsSubscribed(true);
        setPermission('granted');
        console.log('Successfully subscribed to push notifications');
        return true;
      } else {
        throw new Error('Backend subscription failed');
      }
    } catch (err) {
      console.error('Error subscribing to push notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to subscribe to push notifications');
      setIsSubscribed(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, handleRequestPermission]);

  // Unsubscribe from push notifications
  const handleUnsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const subscription = await getCurrentPushSubscription();

      if (subscription) {
        // Unsubscribe from backend
        const result = await notificationsApi.unsubscribeFromPush(subscription.endpoint);

        if (result.success) {
          // Unsubscribe locally
          await unsubscribeFromPushNotifications();
          setIsSubscribed(false);
          console.log('Successfully unsubscribed from push notifications');
          return true;
        } else {
          throw new Error('Backend unsubscribe failed');
        }
      } else {
        // No subscription found, just update state
        setIsSubscribed(false);
        return true;
      }
    } catch (err) {
      console.error('Error unsubscribing from push notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to unsubscribe from push notifications');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    requestPermission: handleRequestPermission,
    subscribe: handleSubscribe,
    unsubscribe: handleUnsubscribe,
  };
}
