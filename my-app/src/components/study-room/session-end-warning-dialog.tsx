"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogPortal,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, AlertTriangle } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

interface SessionEndWarningDialogProps {
  open: boolean;
  minutesRemaining: number;
  onClose?: () => void;
}

export function SessionEndWarningDialog({
  open,
  minutesRemaining,
  onClose,
}: SessionEndWarningDialogProps) {
  const [countdown, setCountdown] = useState(minutesRemaining * 60);

  useEffect(() => {
    if (!open) {
      // Reset countdown when dialog closes
      setCountdown(minutesRemaining * 60);
      return;
    }

    const interval = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [open, minutesRemaining]);

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose?.()}>
      <DialogPortal>
        {/* Custom overlay with very high z-index for fullscreen scenarios */}
        <DialogPrimitive.Overlay
          className={cn(
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 bg-black/70"
          )}
          style={{ zIndex: 10000 }}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] grid w-full max-w-[90vw] sm:max-w-md gap-4 rounded-lg border p-6 shadow-lg duration-200",
            "bg-[#1f1f1f] border-white/10 text-white",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          )}
          style={{ zIndex: 10001 }}
        >
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />
              </div>
              <DialogTitle className="text-lg sm:text-xl text-white">
                Session Ending Soon
              </DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-2xl sm:text-3xl font-bold text-yellow-500 bg-yellow-500/10 rounded-lg py-3">
              <Clock className="h-6 w-6 sm:h-7 sm:w-7" />
              <span>
                {minutes}:{seconds.toString().padStart(2, "0")}
              </span>
            </div>
            <DialogDescription className="text-sm sm:text-base text-white/80">
              Your scheduled session time is about to end. The call will automatically disconnect when the timer reaches zero.
            </DialogDescription>
            <DialogDescription className="text-xs sm:text-sm text-white/60">
              Please wrap up your session and save any important notes.
            </DialogDescription>
          </div>
          <div className="flex justify-end mt-4">
            <Button 
              onClick={onClose}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-medium"
            >
              I Understand
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
