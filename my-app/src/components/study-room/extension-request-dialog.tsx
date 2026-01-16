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
import { Clock, UserPlus } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

interface ExtensionRequestDialogProps {
  open: boolean;
  requesterName: string;
  onApprove: () => void;
  onDismiss: () => void;
}

export function ExtensionRequestDialog({
  open,
  requesterName,
  onApprove,
  onDismiss,
}: ExtensionRequestDialogProps) {
  const [countdown, setCountdown] = useState(30); // Auto-dismiss after 30 seconds

  useEffect(() => {
    if (!open) {
      setCountdown(30);
      return;
    }

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          onDismiss();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [open, onDismiss]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onDismiss()}>
      <DialogPortal>
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
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <UserPlus className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
              </div>
              <DialogTitle className="text-lg sm:text-xl text-white">
                Extension Request
              </DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-lg sm:text-xl font-medium text-blue-400 bg-blue-500/10 rounded-lg py-3 px-4">
              <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
              <span>+10 minutes requested</span>
            </div>
            <DialogDescription className="text-sm sm:text-base text-white/80 text-center">
              <span className="font-semibold text-white">{requesterName}</span> is requesting to extend the session by 10 minutes.
            </DialogDescription>
            <div className="text-xs text-white/40 text-center">
              Auto-dismissing in {countdown}s
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Button 
              onClick={onDismiss}
              variant="outline"
              className="flex-1 border-white/20 text-white hover:bg-white/10"
            >
              Dismiss
            </Button>
            <Button 
              onClick={onApprove}
              className="flex-1 bg-[#00DC6E] hover:bg-[#00b058] text-black font-medium"
            >
              Approve (+10m)
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
