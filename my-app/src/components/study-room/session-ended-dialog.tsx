"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

interface SessionEndedDialogProps {
  open: boolean;
  sessionId: string;
  onReview?: () => void;
}

export function SessionEndedDialog({
  open,
  sessionId,
  onReview,
}: SessionEndedDialogProps) {
  const router = useRouter();

  useEffect(() => {
    if (open) {
      // Automatically redirect after 10 seconds
      const timeout = setTimeout(() => {
        router.push(`/submit-review/${sessionId}`);
      }, 10000);

      return () => clearTimeout(timeout);
    }
  }, [open, sessionId, router]);

  const handleReview = () => {
    if (onReview) {
      onReview();
    } else {
      router.push(`/submit-review/${sessionId}`);
    }
  };

  const handleBackToDashboard = () => {
    router.push("/dashboard");
  };

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-500" />
            </div>
            <DialogTitle className="text-xl">
              Session Completed
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-3">
          <DialogDescription className="text-base">
            Your scheduled session time has ended. Thank you for participating!
          </DialogDescription>
          <DialogDescription className="text-sm text-muted-foreground">
            Please take a moment to review your experience.
          </DialogDescription>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleBackToDashboard}
            className="w-full sm:w-auto"
          >
            Back to Dashboard
          </Button>
          <Button
            onClick={handleReview}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90"
          >
            Leave a Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
