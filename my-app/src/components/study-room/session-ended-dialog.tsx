"use client";

import { useEffect, useState } from "react";
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
import { CheckCircle2, MessageSquareHeart } from "lucide-react";
import { FeedbackForm } from "@/components/feedback/feedback-form";

interface SessionEndedDialogProps {
  open: boolean;
  sessionId: string;
  sessionType?: "studyRoom" | "peerSession";
  onReview?: () => void;
}

export function SessionEndedDialog({
  open,
  sessionId,
  sessionType = "peerSession",
  onReview,
}: SessionEndedDialogProps) {
  const router = useRouter();
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    if (open && !showFeedback) {
      // Automatically redirect after 15 seconds (increased to give time for feedback)
      const timeout = setTimeout(() => {
        router.push(`/submit-review/${sessionId}`);
      }, 15000);

      return () => clearTimeout(timeout);
    }
  }, [open, sessionId, router, showFeedback]);

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

  const handleFeedbackSuccess = () => {
    setShowFeedback(false);
    // Optionally continue to review
  };

  // Show feedback form
  if (showFeedback) {
    return (
      <Dialog open={open}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <MessageSquareHeart className="h-5 w-5 text-primary" />
              Platform Feedback
            </DialogTitle>
            <DialogDescription>
              Help us improve! Your feedback shapes the future of Webyalaya.
            </DialogDescription>
          </DialogHeader>
          <FeedbackForm
            initialFeatureArea={sessionType === "studyRoom" ? "studyRooms" : "peerSessions"}
            initialMetadata={{ sessionId }}
            onSuccess={handleFeedbackSuccess}
            onCancel={() => setShowFeedback(false)}
          />
        </DialogContent>
      </Dialog>
    );
  }

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
        <DialogFooter className="flex-col gap-2">
          <div className="flex flex-col sm:flex-row gap-2 w-full">
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
          </div>
          {process.env.NEXT_PUBLIC_ENABLE_FEEDBACK === "true" && (
            <Button
              variant="ghost"
              onClick={() => setShowFeedback(true)}
              className="w-full text-muted-foreground hover:text-foreground"
            >
              <MessageSquareHeart className="h-4 w-4 mr-2" />
              Give Platform Feedback
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
