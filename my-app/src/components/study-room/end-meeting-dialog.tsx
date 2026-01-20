"use client";

import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogPortal,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

interface EndMeetingDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function EndMeetingDialog({
  open,
  onConfirm,
  onCancel,
}: EndMeetingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogPortal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border border-red-900/30 bg-gradient-to-br from-gray-900 via-gray-900 to-red-950/20 p-6 shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-xl"
          )}
        >
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20 ring-2 ring-red-500/30">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-white">
                  End Meeting for Everyone?
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  This action cannot be undone
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-2 rounded-lg bg-red-950/20 border border-red-900/20 p-4">
            <p className="text-sm text-gray-300">
              Ending the meeting will:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-gray-400">
              <li>• Disconnect all participants immediately</li>
              <li>• Mark the session as completed</li>
              <li>• Save all transcripts and recordings</li>
              <li>• Prevent anyone from rejoining</li>
            </ul>
          </div>

          <div className="flex items-center justify-end gap-3 mt-4">
            <Button
              variant="ghost"
              onClick={onCancel}
              className="text-gray-300 hover:text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              End Meeting
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
