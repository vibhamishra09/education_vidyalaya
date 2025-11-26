"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, AlertTriangle } from "lucide-react";

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
    if (!open) return;

    const interval = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [open]);

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose?.()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-500" />
            </div>
            <DialogTitle className="text-xl">
              Session Ending Soon
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Clock className="h-5 w-5" />
            <span>
              {minutes}:{seconds.toString().padStart(2, "0")} remaining
            </span>
          </div>
          <DialogDescription className="text-base">
            Your scheduled session time is about to end. The call will automatically disconnect when the timer reaches zero.
          </DialogDescription>
          <DialogDescription className="text-sm text-muted-foreground">
            Please wrap up your session and save any important notes.
          </DialogDescription>
        </div>
        <div className="flex justify-end mt-4">
          <Button onClick={onClose}>
            I Understand
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
