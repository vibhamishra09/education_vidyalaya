"use client";

import { useEffect, useState, useCallback } from "react";
import { NotificationToast } from "./notification-toast";
import { useNotificationContext } from "@/contexts/notification-context";

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

interface PushMessagePayload {
  type?: string;
  notification?: {
    title: string;
    body: string;
    icon?: string;
    data?: PushNotificationData["data"];
  };
}

interface PushNotificationData {
  id: string;
  title: string;
  body: string;
  icon?: string;
  data?: {
    actionType?: string;
    peerSessionId?: string;
    studyRoomId?: string;
    sessionId?: string;
    sessionType?: string;
    notificationId?: string;
  };
}

export function PushNotificationListener() {
  const [notifications, setNotifications] = useState<PushNotificationData[]>([]);
  const { refetchNotifications } = useNotificationContext();

  const playNotificationSound = useCallback(() => {
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextConstructor) {
      console.warn('AudioContext not supported in this browser');
      return;
    }

    try {
      // Use Web Audio API to play a simple notification sound
      const audioContext = new AudioContextConstructor();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error('Failed to play notification sound:', error);
    }
  }, []);

  const handlePushNotification = useCallback((event: MessageEvent<PushMessagePayload>) => {
    if (event.data?.type === 'PUSH_NOTIFICATION' && event.data.notification) {
      console.log('📨 [PushNotificationListener] Service worker message received');
      console.log('📨 [PushNotificationListener] Message type:', event.data?.type);
      console.log('📨 [PushNotificationListener] Full event data:', event.data);
      console.log('📬 [PushNotificationListener] Notification payload:', event.data.notification);
      
      const notification = event.data.notification;
      const newNotification: PushNotificationData = {
        id: notification.data?.notificationId || `notif-${Date.now()}`,
        title: notification.title,
        body: notification.body,
        icon: notification.icon,
        data: notification.data,
      };

      console.log('✨ [PushNotificationListener] Created notification object:', newNotification);

      // Add notification to toast queue
      setNotifications((prev) => {
        console.log(`📝 [PushNotificationListener] Adding to queue. Current queue size: ${prev.length}`);
        return [...prev, newNotification];
      });

      // Play notification sound
      console.log('🔊 [PushNotificationListener] Playing notification sound...');
      playNotificationSound();

      // Refetch notifications to update dropdown and unread count
      console.log('🔄 [PushNotificationListener] Scheduling notification refetch...');
      setTimeout(() => {
        console.log('🔄 [PushNotificationListener] Refetching notifications now...');
        refetchNotifications();
      }, 500);

      // Show browser notification if tab is not focused
      if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        console.log('👁️ [PushNotificationListener] Tab hidden - showing browser notification');
        try {
          new Notification(notification.title, {
            body: notification.body,
            icon: notification.icon || '/icon-192x192.png',
            badge: '/badge-72x72.png',
            tag: notification.data?.notificationId || 'default',
          });
          console.log('✅ [PushNotificationListener] Browser notification shown');
        } catch (error) {
          console.error('❌ [PushNotificationListener] Failed to show browser notification:', error);
        }
      } else {
        console.log('👁️ [PushNotificationListener] Tab visible - in-app toast will be displayed');
      }
      
      console.log('✅ [PushNotificationListener] Notification processing complete');
    } else {
      console.log('⚠️ [PushNotificationListener] Received non-push message, ignoring');
    }
  }, [refetchNotifications, playNotificationSound]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return;
    }

    console.log('🎧 Setting up push notification listener');

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', handlePushNotification);

    // Check if service worker is ready and request an initial notification test
    navigator.serviceWorker.ready.then(() => {
      console.log('✅ Service Worker is ready and listening for push notifications');
    });

    return () => {
      navigator.serviceWorker.removeEventListener('message', handlePushNotification);
    };
  }, [handlePushNotification]);

  const handleDismiss = (id: string) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 z-[100] max-w-sm w-full space-y-2 pointer-events-none">
      <div className="pointer-events-auto">
        {notifications.map((notification) => (
          <NotificationToast
            key={notification.id}
            id={notification.id}
            title={notification.title}
            body={notification.body}
            icon={notification.icon}
            data={notification.data}
            onDismiss={handleDismiss}
            duration={8000}
          />
        ))}
      </div>
    </div>
  );
}
