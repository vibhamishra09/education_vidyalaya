/**
 * Utility function to get the navigation link for a notification
 * Based on the notification type and associated data
 * 
 * @param notification - The notification object
 * @returns The URL path to navigate to when clicking the notification
 */
import { Notification } from '@/types/api.types';

export function getNotificationLink(notification: Notification): string {
  // Use actionType for precise navigation
  if (notification.actionType) {
    switch (notification.actionType) {
      // Peer Session Notifications - Navigate to session detail page
      case 'SESSION_REQUEST':
      case 'SESSION_ACCEPTED':
      case 'SESSION_CANCELLED':
      case 'SESSION_REMINDER_24H':
      case 'SESSION_REMINDER_1H':
      case 'SESSION_REMINDER_5M':
        if (notification.peerSessionId) {
          return `/sessions/${notification.peerSessionId}`;
        }
        // Fallback: try parsing actionData
        if (notification.actionData) {
          try {
            const data = JSON.parse(notification.actionData);
            if (data.sessionId) {
              return `/sessions/${data.sessionId}`;
            }
          } catch (e) {
            console.error('Failed to parse actionData:', e);
          }
        }
        return '/dashboard';

      // Peer Session Review Notifications - Navigate to review form
      case 'SESSION_COMPLETE_REVIEW':
      case 'SESSION_ENDED_REVIEW':
        if (notification.peerSessionId) {
          return `/submit-review/${notification.peerSessionId}?type=peerSession`;
        }
        // Fallback: try parsing actionData
        if (notification.actionData) {
          try {
            const data = JSON.parse(notification.actionData);
            if (data.sessionId) {
              return `/submit-review/${data.sessionId}?type=peerSession`;
            }
          } catch (e) {
            console.error('Failed to parse actionData:', e);
          }
        }
        return '/dashboard';

      // Study Room Notifications - Navigate to study room detail page
      case 'STUDYROOM_JOINED':
      case 'STUDYROOM_REMINDER_24H':
      case 'STUDYROOM_REMINDER_1H':
      case 'STUDYROOM_REMINDER_5M':
        if (notification.studyRoomId) {
          return `/studyroom/${notification.studyRoomId}`;
        }
        // Fallback: try parsing actionData
        if (notification.actionData) {
          try {
            const data = JSON.parse(notification.actionData);
            if (data.sessionId) {
              return `/studyroom/${data.sessionId}`;
            }
          } catch (e) {
            console.error('Failed to parse actionData:', e);
          }
        }
        return '/dashboard';

      // Study Room Review Notifications - Navigate to review form
      case 'STUDYROOM_ENDED_REVIEW':
        if (notification.studyRoomId) {
          return `/submit-review/${notification.studyRoomId}?type=studyRoom`;
        }
        // Fallback: try parsing actionData
        if (notification.actionData) {
          try {
            const data = JSON.parse(notification.actionData);
            if (data.sessionId) {
              return `/submit-review/${data.sessionId}?type=studyRoom`;
            }
          } catch (e) {
            console.error('Failed to parse actionData:', e);
          }
        }
        return '/dashboard';

      // Review Notifications
      case 'REVIEW_RECEIVED':
        // Navigate to own profile reviews tab
        return '/profile?tab=reviews';

      case 'REVIEW_REMINDER':
        // Parse actionData to determine session type and ID
        if (notification.actionData) {
          try {
            const data = JSON.parse(notification.actionData);
            if (data.sessionId && data.sessionType) {
              return `/submit-review/${data.sessionId}?type=${data.sessionType}`;
            }
          } catch (e) {
            console.error('Failed to parse actionData:', e);
          }
        }
        // Fallback: try peerSessionId or studyRoomId
        if (notification.peerSessionId) {
          return `/submit-review/${notification.peerSessionId}?type=peerSession`;
        }
        if (notification.studyRoomId) {
          return `/submit-review/${notification.studyRoomId}?type=studyRoom`;
        }
        return '/dashboard';

      // Payment Notifications
      case 'PAYMENT_RELEASED':
        // Navigate to profile wallet tab
        return '/profile?tab=wallet';

      default:
        // Unknown actionType, fallback to dashboard
        return '/dashboard';
    }
  }

  // Fallback: Parse notification message for basic routing
  const message = notification.message.toLowerCase();
  if (message.includes("session request") || message.includes("requested a peer session")) {
    // Try to find peerSessionId
    if (notification.peerSessionId) {
      return `/sessions/${notification.peerSessionId}`;
    }
    return '/dashboard';
  }
  if (message.includes("starts in") || message.includes("reminder")) {
    // Try to determine if it's a peer session or study room
    if (notification.peerSessionId) {
      return `/sessions/${notification.peerSessionId}`;
    }
    if (notification.studyRoomId) {
      return `/studyroom/${notification.studyRoomId}`;
    }
    return '/dashboard';
  }
  if (message.includes("review") || message.includes("left you a review")) {
    if (message.includes("left you") || message.includes("received")) {
      return '/profile?tab=reviews';
    }
    // Review reminder or completion
    if (notification.peerSessionId) {
      return `/submit-review/${notification.peerSessionId}?type=peerSession`;
    }
    if (notification.studyRoomId) {
      return `/submit-review/${notification.studyRoomId}?type=studyRoom`;
    }
    return '/profile?tab=reviews';
  }
  if (message.includes("payment") || message.includes("released") || message.includes("coins")) {
    return '/profile?tab=wallet';
  }

  // Final fallback
  return '/dashboard';
}

