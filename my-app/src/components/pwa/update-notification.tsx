"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const DISMISSED_KEY = "pwa-update-notification-dismissed";

export function UpdateNotification() {
  const [isVisible, setIsVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // Get service worker registration
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;

      setRegistration(reg);

      // Check for updates
      const checkForUpdates = () => {
        reg.update();
      };

      // Listen for updates
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            // New service worker available
            const dismissedData = localStorage.getItem(DISMISSED_KEY);
            if (!dismissedData) {
              setIsVisible(true);
            }
          }
        });
      });

      // Check for updates on page load
      checkForUpdates();

      // Check for updates periodically (every 30 minutes)
      const updateInterval = setInterval(checkForUpdates, 30 * 60 * 1000);

      return () => clearInterval(updateInterval);
    });

    // Listen for controller change (when new SW takes over)
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      // Reload the page to get the new service worker
      window.location.reload();
    });
  }, []);

  const handleUpdate = async () => {
    if (!registration || !registration.waiting) {
      return;
    }

    setIsUpdating(true);

    try {
      // Tell the service worker to skip waiting and activate
      registration.waiting.postMessage({ type: "SKIP_WAITING" });

      // Wait a bit for the service worker to activate
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Reload the page
      window.location.reload();
    } catch (error) {
      console.error("Error updating service worker:", error);
      setIsUpdating(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Store dismissal (expires on next update)
    localStorage.setItem(
      DISMISSED_KEY,
      JSON.stringify({ timestamp: Date.now() })
    );
  };

  // Clear dismissal when service worker updates
  useEffect(() => {
    if (registration) {
      registration.addEventListener("updatefound", () => {
        localStorage.removeItem(DISMISSED_KEY);
      });
    }
  }, [registration]);

  if (!isVisible) {
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
          className="fixed bottom-4 left-4 z-50 max-w-md"
        >
          <Card className="rounded-[20px] border border-border/40 shadow-2xl shadow-primary/10 bg-white dark:bg-card w-[360px]">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <RefreshCw className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground mb-1">
                    Update Available
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    A new version of Webyalaya is available. Update now to get the latest features and improvements.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleUpdate}
                      disabled={isUpdating}
                      size="sm"
                      className="flex-1"
                    >
                      {isUpdating ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Update Now
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleDismiss}
                      variant="ghost"
                      size="sm"
                      className="px-3"
                    >
                      <X className="h-4 w-4" />
                    </Button>
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
