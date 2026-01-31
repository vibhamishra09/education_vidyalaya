"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, AlertCircle } from "lucide-react";
import { usePushNotifications } from "@/hooks";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@clerk/nextjs";

const DISMISSED_KEY = "push-notification-prompt-dismissed";
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export function PushNotificationPrompt() {
  const [isDismissed, setIsDismissed] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const { isSignedIn } = useUser();
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
  } = usePushNotifications();

  useEffect(() => {
    // Don't show prompt if user is not signed in
    if (!isSignedIn) {
      return;
    }

    // Check if prompt was dismissed
    const dismissedData = localStorage.getItem(DISMISSED_KEY);
    if (dismissedData) {
      const { timestamp } = JSON.parse(dismissedData);
      const now = Date.now();
      if (now - timestamp < DISMISS_DURATION) {
        setIsDismissed(true);
        return;
      }
    }

    // Show prompt if notifications are supported, not subscribed, and permission not denied
    if (isSupported && !isSubscribed && permission !== "denied") {
      setIsDismissed(false);
      // Delay showing the prompt to avoid overwhelming the user
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000); // Show after 3 seconds

      return () => clearTimeout(timer);
    }
  }, [isSupported, isSubscribed, permission, isSignedIn]);

  const handleEnable = async () => {
    const success = await subscribe();
    if (success) {
      setIsVisible(false);
      setIsDismissed(true);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    // Store dismissal timestamp
    localStorage.setItem(
      DISMISSED_KEY,
      JSON.stringify({ timestamp: Date.now() })
    );
  };

  // Don't show if user is not signed in, dismissed, or not supported
  if (!isSignedIn || isDismissed || !isSupported) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-4 right-4 z-50 max-w-md"
        >
          <Card className="rounded-[20px] border border-border/40 shadow-2xl shadow-primary/10 bg-white dark:bg-card w-[360px]">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 rounded-full p-2.5 flex-shrink-0 mt-0.5">
                  <Bell className="h-5 w-5 text-primary" strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm tracking-tight text-foreground">
                    Enable Push Notifications
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1 mb-3">
                    Get notified about session requests, reminders, and reviews.
                  </p>
                  
                  {error && (
                    <div className="flex items-center gap-2 text-xs text-destructive mb-3">
                      <AlertCircle className="h-3 w-3" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleDismiss}
                      disabled={isLoading}
                      className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2"
                    >
                      Not Now
                    </button>
                    
                    <button
                      onClick={handleEnable}
                      disabled={isLoading}
                      className="flex-1 flex items-center justify-center gap-2 h-10 rounded-full bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 text-sm font-bold hover:bg-green-500/20 transition-all shadow-sm"
                    >
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                      </span>
                      {isLoading ? "Enabling..." : "Enable"}
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
