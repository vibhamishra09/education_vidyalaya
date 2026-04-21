"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@clerk/nextjs";

const DISMISSED_KEY = "pwa-install-prompt-dismissed";
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const { isSignedIn } = useUser();

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

    // Check if app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      // App is already installed
      return;
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the default browser install prompt
      e.preventDefault();
      // Store the event for later use
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsDismissed(false);
      
      // Show prompt after a delay
      setTimeout(() => {
        setIsVisible(true);
      }, 5000); // Show after 5 seconds
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Check if app is already installed (for iOS)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = 
      ("standalone" in window.navigator && 
        (window.navigator as Navigator & { standalone?: boolean }).standalone) ||
      window.matchMedia("(display-mode: standalone)").matches;

    if (isIOS && !isInStandaloneMode) {
      // For iOS, we can show a custom message
      setIsDismissed(false);
      setTimeout(() => {
        setIsVisible(true);
      }, 5000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [isSignedIn]);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // For iOS, show instructions
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        alert(
          "To install We on iOS:\n\n" +
          "1. Tap the Share button (square with arrow)\n" +
          "2. Scroll down and tap 'Add to Home Screen'\n" +
          "3. Tap 'Add' to confirm"
        );
        handleDismiss();
        return;
      }
      return;
    }

    setIsInstalling(true);
    
    try {
      // Show the install prompt
      await deferredPrompt.prompt();
      
      // Wait for the user to respond
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === "accepted") {
        console.log("✅ User accepted the install prompt");
        setIsVisible(false);
        setIsDismissed(true);
        localStorage.setItem(
          DISMISSED_KEY,
          JSON.stringify({ timestamp: Date.now() })
        );
      } else {
        console.log("❌ User dismissed the install prompt");
        handleDismiss();
      }
      
      // Clear the deferred prompt
      setDeferredPrompt(null);
    } catch (error) {
      console.error("Error showing install prompt:", error);
    } finally {
      setIsInstalling(false);
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

  // Don't show if user is not signed in, dismissed, or no prompt available
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (!isSignedIn || isDismissed || (!deferredPrompt && !isIOS)) {
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
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Download className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground mb-1">
                    Install We
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Install our app for a better experience. Get quick access, offline support, and push notifications.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleInstall}
                      disabled={isInstalling}
                      size="sm"
                      className="flex-1"
                    >
                      {isInstalling ? "Installing..." : "Install App"}
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
