import { Notification } from '@/types/api.types';

function parseActionSessionId(notification: Notification): string | null {
  if (!notification.actionData) return null;
  try {
    const data = JSON.parse(notification.actionData) as { sessionId?: unknown };
    return typeof data.sessionId === 'string' ? data.sessionId : null;
  } catch {
    return null;
  }
}

function peerSessionPath(n: Notification): string {
  if (n.peerSessionId) return `/sessions/${n.peerSessionId}`;
  const sid = parseActionSessionId(n);
  return sid ? `/sessions/${sid}` : '/dashboard';
}

function studyRoomPath(n: Notification): string {
  if (n.studyRoomId) return `/studyroom/${n.studyRoomId}`;
  const sid = parseActionSessionId(n);
  return sid ? `/studyroom/${sid}` : '/dashboard';
}

function peerReviewPath(n: Notification): string {
  if (n.peerSessionId) return `/submit-review/${n.peerSessionId}?type=peerSession`;
  const sid = parseActionSessionId(n);
  return sid ? `/submit-review/${sid}?type=peerSession` : '/dashboard';
}

function studyReviewPath(n: Notification): string {
  if (n.studyRoomId) return `/submit-review/${n.studyRoomId}?type=studyRoom`;
  const sid = parseActionSessionId(n);
  return sid ? `/submit-review/${sid}?type=studyRoom` : '/dashboard';
}

export function getNotificationLink(notification: Notification): string {
  if (notification.actionType) {
    switch (notification.actionType) {
      case 'SESSION_REQUEST':
      case 'SESSION_ACCEPTED':
      case 'SESSION_CANCELLED':
      case 'SESSION_REMINDER_24H':
      case 'SESSION_REMINDER_1H':
      case 'SESSION_REMINDER_5M':
      case 'PEER_SESSION_DETAILS_UPDATED':
        return peerSessionPath(notification);

      case 'SESSION_COMPLETE_REVIEW':
      case 'SESSION_ENDED_REVIEW':
        return peerReviewPath(notification);

      case 'STUDYROOM_JOINED':
      case 'STUDYROOM_REMINDER_24H':
      case 'STUDYROOM_REMINDER_1H':
      case 'STUDYROOM_REMINDER_5M':
      case 'STUDY_ROOM_DETAILS_UPDATED':
        return studyRoomPath(notification);

      case 'STUDYROOM_ENDED_REVIEW':
        return studyReviewPath(notification);

      case 'REVIEW_RECEIVED':
        return '/profile?tab=reviews';

      case 'REVIEW_REMINDER':
        if (notification.actionData) {
          try {
            const data = JSON.parse(notification.actionData) as {
              sessionId?: string;
              sessionType?: string;
            };
            if (data.sessionId && data.sessionType) {
              return `/submit-review/${data.sessionId}?type=${data.sessionType}`;
            }
          } catch (e) {
            console.error('Failed to parse actionData:', e);
          }
        }
        if (notification.peerSessionId) {
          return `/submit-review/${notification.peerSessionId}?type=peerSession`;
        }
        if (notification.studyRoomId) {
          return `/submit-review/${notification.studyRoomId}?type=studyRoom`;
        }
        return '/dashboard';

      case 'PAYMENT_RELEASED':
        return '/profile?tab=wallet';

      default:
        return '/dashboard';
    }
  }

  const message = notification.message.toLowerCase();
  if (message.includes("session request") || message.includes("requested a peer session")) {
    return notification.peerSessionId
      ? `/sessions/${notification.peerSessionId}`
      : '/dashboard';
  }
  if (message.includes("starts in") || message.includes("reminder")) {
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

  return '/dashboard';
}
