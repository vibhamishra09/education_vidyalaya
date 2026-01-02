"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { 
  CheckCircle2,  
  Loader2, 
  Star,
  X,
  Sparkles,
  PartyPopper,
} from "lucide-react";
import { SessionFeedbackForm } from "@/components/feedback/session-feedback-form";
import { ReviewForm } from "@/components/forms/review-form";
import { studyRoomsApi, peerSessionsApi } from "@/lib/api";
import { setAuthToken } from "@/lib/api-client";
import { SessionFeedbackAnswers, SessionFeedbackSubmission } from "@/types/api.types";
import { toast } from "sonner";

// Flow:
// Participant: review -> feedback -> complete
// Host: feedback -> complete

type DialogStep = "review" | "feedback" | "complete";

interface SessionEndedDialogProps {
  open: boolean;
  sessionId: string;
  sessionType?: "studyRoom" | "peerSession";
  isHost?: boolean;
  onClose?: () => void;
}

export function SessionEndedDialog({
  open,
  sessionId,
  sessionType = "peerSession",
  isHost = false,
}: SessionEndedDialogProps) {
  const router = useRouter();
  const { getToken } = useAuth();
  // For participant: start with review, for host: start with feedback
  const [step, setStep] = useState<DialogStep>(isHost ? "feedback" : "review");
  const [loading, setLoading] = useState(false);

  const handleBackToDashboard = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  // Review handlers
  const handleReviewSuccess = () => {
    toast.success("Review submitted successfully!");
    // After review, participant goes to feedback
    setStep("feedback");
  };

  const handleReviewSkip = () => {
    // Skip review, go to feedback
    setStep("feedback");
  };

  // Feedback handlers
  const handleFeedbackComplete = useCallback(async (answers: SessionFeedbackAnswers) => {
    setLoading(true);

    try {
      const token = await getToken();
      if (token) {
        setAuthToken(token);
      }

      const feedbackSubmission: SessionFeedbackSubmission = {
        sessionId,
        sessionType,
        isHost,
        answers,
        submittedAt: new Date().toISOString(),
      };

      if (sessionType === "studyRoom") {
        await studyRoomsApi.submitSessionFeedback(sessionId, feedbackSubmission);
      } else {
        await peerSessionsApi.submitSessionFeedback(sessionId, feedbackSubmission);
      }

      toast.success("Thank you for your feedback!");
      setStep("complete");
      
      // Auto redirect after showing completion
      setTimeout(() => {
        router.push("/dashboard");
      }, 3000);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Failed to submit feedback");
      setStep("complete");
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } finally {
      setLoading(false);
    }
  }, [sessionId, sessionType, isHost, getToken, router]);

  const handleFeedbackSkip = useCallback(() => {
    setStep("complete");
    setTimeout(() => {
      router.push("/dashboard");
    }, 2000);
  }, [router]);

  if (!open) return null;

  // Render review step
  const renderReview = () => (
    <Card className="w-full max-w-lg border-0 shadow-2xl bg-background/95 backdrop-blur animate-in zoom-in-95 duration-300">
      <CardHeader className="relative bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-transparent pb-4">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
          onClick={handleBackToDashboard}
        >
          <X className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow-lg">
            <Star className="h-7 w-7 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              Leave a Review
              <Sparkles className="h-5 w-5 text-yellow-500" />
            </h2>
            <p className="text-muted-foreground mt-1">
              Share your experience to help others
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6">
        <ReviewForm
          sessionId={sessionId}
          sessionType={sessionType}
          sessionTitle="Session"
          revieweeName="Session Host"
          sessionDate={new Date().toISOString()}
          onSuccess={handleReviewSuccess}
          onCancel={handleReviewSkip}
        />
        
        <div className="mt-4 flex justify-end">
          <Button 
            variant="ghost" 
            onClick={handleReviewSkip}
            className="text-muted-foreground hover:text-foreground"
          >
            Skip for now
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Render feedback step
  const renderFeedback = () => (
    <div className="w-full max-w-2xl animate-in zoom-in-95 duration-300">
      <SessionFeedbackForm
        sessionId={sessionId}
        sessionType={sessionType}
        isHost={isHost}
        onComplete={handleFeedbackComplete}
        onSkip={handleFeedbackSkip}
        loading={loading}
        onBackToDashboard={handleBackToDashboard}
      />
    </div>
  );

  // Render completion step
  const renderComplete = () => (
    <Card className="w-full max-w-md border-0 shadow-2xl bg-background/95 backdrop-blur animate-in zoom-in-95 duration-300">
      <CardContent className="pt-10 pb-8">
        <div className="text-center space-y-6">
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 animate-pulse" />
            <div className="absolute inset-1 rounded-full bg-background flex items-center justify-center">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                <PartyPopper className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
              Thank You!
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </h2>
            <p className="text-muted-foreground">
              Your feedback helps us build a better learning platform for everyone.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-full py-2 px-4 mx-auto w-fit">
            <Loader2 className="h-4 w-4 animate-spin" />
            Redirecting to dashboard...
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Render current step content
  const renderContent = () => {
    switch (step) {
      case "review":
        return renderReview();
      case "feedback":
        return renderFeedback();
      case "complete":
        return renderComplete();
      default:
        return null;
    }
  };

  // Full screen overlay with blurred background effect
  return (
    <div className="fixed inset-0 z-50">
      {/* Dark blurred overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      
      {/* Content container */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4 overflow-y-auto">
        {renderContent()}
      </div>
    </div>
  );
}
