"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, UserPlus, Calendar, AlertCircle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface NotificationToastProps {
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
  onDismiss: (id: string) => void;
  duration?: number;
}

export function NotificationToast({
  id,
  title,
  body,
  icon,
  data,
  onDismiss,
  duration = 8000,
}: NotificationToastProps) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss(id);
    }, 300);
  };

  const handleClick = () => {
    const url = getNotificationUrl(data);
    handleDismiss();
    router.push(url);
  };

  const getNotificationUrl = (notificationData?: NotificationToastProps['data']): string => {
    if (!notificationData?.actionType) {
      return '/dashboard';
    }

    switch (notificationData.actionType) {
      // Peer Session Notifications
      case 'SESSION_REQUEST':
      case 'SESSION_ACCEPTED':
      case 'SESSION_CANCELLED':
      case 'SESSION_REMINDER_24H':
      case 'SESSION_REMINDER_1H':
      case 'SESSION_REMINDER_5M':
        if (notificationData.peerSessionId) {
          return `/sessions/${notificationData.peerSessionId}`;
        } else if (notificationData.sessionId && notificationData.sessionType === 'peerSession') {
          return `/sessions/${notificationData.sessionId}`;
        }
        return '/dashboard';

      // Peer Session Review Notifications
      case 'SESSION_COMPLETE_REVIEW':
      case 'SESSION_ENDED_REVIEW':
        if (notificationData.peerSessionId) {
          return `/submit-review/${notificationData.peerSessionId}?type=peerSession`;
        } else if (notificationData.sessionId && notificationData.sessionType === 'peerSession') {
          return `/submit-review/${notificationData.sessionId}?type=peerSession`;
        }
        return '/dashboard';

      // Study Room Notifications
      case 'STUDYROOM_JOINED':
      case 'STUDYROOM_REMINDER_24H':
      case 'STUDYROOM_REMINDER_1H':
      case 'STUDYROOM_REMINDER_5M':
        if (notificationData.studyRoomId) {
          return `/studyroom/${notificationData.studyRoomId}`;
        } else if (notificationData.sessionId && notificationData.sessionType === 'studyRoom') {
          return `/studyroom/${notificationData.sessionId}`;
        }
        return '/dashboard';

      // Study Room Review Notifications
      case 'STUDYROOM_ENDED_REVIEW':
        if (notificationData.studyRoomId) {
          return `/submit-review/${notificationData.studyRoomId}?type=studyRoom`;
        } else if (notificationData.sessionId && notificationData.sessionType === 'studyRoom') {
          return `/submit-review/${notificationData.sessionId}?type=studyRoom`;
        }
        return '/dashboard';

      // Review Notifications
      case 'REVIEW_RECEIVED':
        return '/profile?tab=reviews';

      case 'REVIEW_REMINDER':
        if (notificationData.sessionId && notificationData.sessionType) {
          return `/submit-review/${notificationData.sessionId}?type=${notificationData.sessionType}`;
        } else if (notificationData.peerSessionId) {
          return `/submit-review/${notificationData.peerSessionId}?type=peerSession`;
        } else if (notificationData.studyRoomId) {
          return `/submit-review/${notificationData.studyRoomId}?type=studyRoom`;
        }
        return '/dashboard';

      // Payment Notifications
      case 'PAYMENT_RELEASED':
        return '/profile?tab=earnings';

      default:
        return '/dashboard';
    }
  };

  const getNotificationIcon = () => {
    if (icon) {
      return <img src={icon} alt="" className="w-10 h-10 rounded-full" />;
    }

    const iconClass = "w-5 h-5";
    switch (data?.actionType) {
      case 'SESSION_REQUEST':
        return (
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
            <UserPlus className={`${iconClass} text-blue-600 dark:text-blue-400`} />
          </div>
        );
      case 'STUDYROOM_JOINED':
        return (
          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
            <UserPlus className={`${iconClass} text-green-600 dark:text-green-400`} />
          </div>
        );
      case 'SESSION_REMINDER_24H':
      case 'SESSION_REMINDER_1H':
      case 'SESSION_REMINDER_5M':
      case 'STUDYROOM_REMINDER_24H':
      case 'STUDYROOM_REMINDER_1H':
      case 'STUDYROOM_REMINDER_5M':
        return (
          <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
            <Calendar className={`${iconClass} text-orange-600 dark:text-orange-400`} />
          </div>
        );
      case 'SESSION_COMPLETE_REVIEW':
      case 'SESSION_ENDED_REVIEW':
      case 'STUDYROOM_ENDED_REVIEW':
      case 'REVIEW_REMINDER':
        return (
          <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
            <Star className={`${iconClass} text-yellow-600 dark:text-yellow-400`} />
          </div>
        );
      case 'SESSION_CANCELLED':
        return (
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
            <AlertCircle className={`${iconClass} text-red-600 dark:text-red-400`} />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Bell className={`${iconClass} text-primary`} />
          </div>
        );
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, x: 300, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="mb-2"
      >
        <Card className="shadow-lg border-l-4 border-l-primary overflow-hidden hover:shadow-xl transition-shadow">
          <div className="p-4">
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="flex-shrink-0 mt-1">
                {getNotificationIcon()}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 cursor-pointer" onClick={handleClick}>
                <h4 className="font-semibold text-sm mb-1 line-clamp-1">
                  {title}
                </h4>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {body}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClick();
                    }}
                  >
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDismiss();
                    }}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 p-1 hover:bg-muted rounded-full transition-colors"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress Bar */}
            <motion.div
              className="absolute bottom-0 left-0 h-1 bg-primary"
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: duration / 1000, ease: "linear" }}
            />
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
