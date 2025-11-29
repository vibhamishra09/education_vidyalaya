/**
 * Utility functions for Web Push Notifications
 */

/**
 * Convert a base64 string to Uint8Array
 * Required for VAPID public key conversion
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if push notifications are supported
 */
export function isPushNotificationSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Get current notification permission status
 */
export function getNotificationPermissionStatus(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Check if user has granted notification permissions
 */
export function hasNotificationPermission(): boolean {
  return getNotificationPermissionStatus() === 'granted';
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  // Request permission
  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Register service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    console.log('✅ Service Worker registered:', registration);
    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;
    return registration;
  } catch (error) {
    console.error('❌ Service Worker registration failed:', error);
    throw error;
  }
}

/**
 * Get existing service worker registration
 */
export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.log('🔧 Service workers not supported in navigator');
    return null;
  }

  try {
    console.log('🔧 Checking for existing service worker...');
    // First check if there's already a registration
    const existingReg = await navigator.serviceWorker.getRegistration();
    if (existingReg) {
      console.log('✅ Found existing service worker registration:', existingReg);
      // Wait for it to be ready
      await navigator.serviceWorker.ready;
      return existingReg;
    }
    
    console.log('🔧 No existing service worker registration found');
    return null;
  } catch (error) {
    console.error('❌ Failed to get service worker registration:', error);
    console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPushNotifications(
  vapidPublicKey: string
): Promise<PushSubscription | null> {
  console.log('🔧 Starting subscribeToPushNotifications with key:', vapidPublicKey.substring(0, 20) + '...');
  
  try {
    // Get or register service worker
    console.log('🔧 Getting service worker registration...');
    let registration = await getServiceWorkerRegistration();
    if (!registration) {
      console.log('🔧 No existing registration, registering new service worker...');
      registration = await registerServiceWorker();
    }

    if (!registration) {
      throw new Error('Service worker registration failed - registration is null');
    }
    console.log('🔧 Service worker registration obtained:', registration);
    console.log('🔧 Service worker state:', registration.active?.state);

    // Wait for service worker to be active
    if (registration.installing) {
      console.log('🔧 Service worker is installing, waiting...');
      await new Promise((resolve) => {
        registration!.installing!.addEventListener('statechange', function() {
          if (this.state === 'activated') {
            resolve(undefined);
          }
        });
      });
    }

    // Check if already subscribed
    console.log('🔧 Checking for existing subscription...');
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      console.log('✅ Already subscribed to push notifications');
      return existingSubscription;
    }
    console.log('🔧 No existing subscription, creating new one...');

    // Convert VAPID key
    console.log('🔧 Converting VAPID key to Uint8Array...');
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
    console.log('🔧 VAPID key converted, length:', applicationServerKey.length);

    // Subscribe to push notifications
    console.log('🔧 Calling pushManager.subscribe...');
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey as BufferSource,
    });

    console.log('✅ Push subscription created:', subscription);
    return subscription;
  } catch (error) {
    console.error('❌ Failed to subscribe to push notifications:', error);
    console.error('❌ Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Re-throw the error so the caller gets the actual error message
    throw error;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  try {
    const registration = await getServiceWorkerRegistration();
    if (!registration) {
      return false;
    }

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      return true; // Already unsubscribed
    }

    const unsubscribed = await subscription.unsubscribe();
    console.log('Unsubscribed from push notifications:', unsubscribed);
    return unsubscribed;
  } catch (error) {
    console.error('Failed to unsubscribe from push notifications:', error);
    return false;
  }
}

/**
 * Get current push subscription
 */
export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  try {
    const registration = await getServiceWorkerRegistration();
    if (!registration) {
      return null;
    }

    const subscription = await registration.pushManager.getSubscription();
    return subscription;
  } catch (error) {
    console.error('Failed to get push subscription:', error);
    return null;
  }
}
