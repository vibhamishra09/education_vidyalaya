"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { 
  CheckCircle2,  
  Loader2, 
  Star,
  Sparkles,
  PartyPopper,
  ArrowRight,
  MessageSquareHeart,
} from "lucide-react";
import { SessionFeedbackForm } from "@/components/feedback/session-feedback-form";
import { ReviewForm } from "@/components/forms/review-form";
import { studyRoomsApi, peerSessionsApi } from "@/lib/api";
import { setAuthToken } from "@/lib/api-client";
import { SessionFeedbackAnswers, SessionFeedbackSubmission, PeerSession, StudyRoom } from "@/types/api.types";
import { toast } from "sonner";

// Flow:
// Participant: review -> feedback -> complete
// Host: feedback -> complete

type PageStep = "review" | "feedback" | "complete";

interface SessionDetails {
  title: string;
  hostName: string;
  date: string;
}

export default function SessionFeedbackPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { getToken } = useAuth();
  
  const sessionId = params.sessionId as string;
  const sessionType = (searchParams.get("type") as "studyRoom" | "peerSession") || "peerSession";
  const isHost = searchParams.get("isHost") === "true";
  
  // For participant: start with review, for host: start with feedback
  const [step, setStep] = useState<PageStep>(isHost ? "feedback" : "review");
  const [loading, setLoading] = useState(false);
  const [sessionDetails, setSessionDetails] = useState<SessionDetails>({
    title: "Session",
    hostName: "Session Host",
    date: new Date().toISOString(),
  });
  const [loadingDetails, setLoadingDetails] = useState(true);

  // Fetch session details to get host name and title
  useEffect(() => {
    const fetchSessionDetails = async () => {
      try {
        const token = await getToken();
        if (token) {
          setAuthToken(token);
        }

        if (sessionType === "studyRoom") {
          const data = await studyRoomsApi.getStudyRoomDetails(sessionId) as StudyRoom;
          setSessionDetails({
            title: data.title || "Study Room",
            hostName: data.createdBy?.name || "Session Host",
            date: typeof data.date === 'string' ? data.date : new Date(data.date).toISOString(),
          });
        } else {
          const data = await peerSessionsApi.getPeerSessionDetails(sessionId) as PeerSession;
          // For peer sessions, the host is requestedTo (the teacher)
          setSessionDetails({
            title: data.title || "Peer Session",
            hostName: data.requestedTo?.name || "Session Host",
            date: typeof data.date === 'string' ? data.date : new Date(data.date).toISOString(),
          });
        }
      } catch (error) {
        console.error("Error fetching session details:", error);
        // Keep default values on error
      } finally {
        setLoadingDetails(false);
      }
    };

    if (sessionId) {
      fetchSessionDetails();
    }
  }, [sessionId, sessionType, getToken]);

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

  // Render review step
  const renderReview = () => (
    <Card className="w-full max-w-lg border-0 shadow-2xl bg-card animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      <CardHeader className="relative bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-transparent pb-4 rounded-t-xl">
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
        {loadingDetails ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ReviewForm
            sessionId={sessionId}
            sessionType={sessionType}
            sessionTitle={sessionDetails.title}
            revieweeName={sessionDetails.hostName}
            sessionDate={sessionDetails.date}
            onSuccess={handleReviewSuccess}
            onCancel={handleReviewSkip}
          />
        )}
        
        <div className="mt-6 pt-4 border-t flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={handleBackToDashboard}
            className="text-muted-foreground hover:text-foreground"
          >
            Exit to Dashboard
          </Button>
          <Button 
            variant="ghost" 
            onClick={handleReviewSkip}
            className="text-muted-foreground hover:text-foreground gap-1"
          >
            Skip for now
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Render feedback step
  const renderFeedback = () => (
    <div className="w-full max-w-2xl animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
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
    <Card className="w-full max-w-md border-0 shadow-2xl bg-card animate-in fade-in-0 zoom-in-95 duration-500">
      <CardContent className="pt-10 pb-8">
        <div className="text-center space-y-6">
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 animate-pulse opacity-50" />
            <div className="absolute inset-2 rounded-full bg-background" />
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
              <PartyPopper className="h-8 w-8 text-white" />
            </div>
          </div>
          
          <div className="space-y-3">
            <h2 className="text-3xl font-bold flex items-center justify-center gap-2">
              Thank You!
              <CheckCircle2 className="h-7 w-7 text-green-500" />
            </h2>
            <p className="text-muted-foreground text-lg">
              Your feedback helps us build a better learning platform for everyone.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-full py-3 px-5 mx-auto w-fit">
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Header with branding */}
      <div className="relative z-10 py-6 px-8">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
            <MessageSquareHeart className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-white">Webyalaya</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-100px)] px-4 pb-8">
        {renderContent()}
      </div>

      {/* Footer text */}
      <div className="relative z-10 text-center pb-6 text-sm text-slate-400">
        Your responses are confidential and help us improve the platform
      </div>
    </div>
  );
}
