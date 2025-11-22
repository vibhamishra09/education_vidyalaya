"use client";

import { use, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { ReviewForm } from "@/components/forms/review-form";
import { toast } from "sonner";

export default function SubmitReviewPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sessionId } = use(params);
  
  const [sessionData, setSessionData] = useState<{
    id: string;
    title: string;
    date: string;
    createdBy?: { name: string };
    requestedBy?: { name: string };
    requestedTo?: { name: string };
  } | null>(null);
  const [sessionType, setSessionType] = useState<'studyRoom' | 'peerSession'>('peerSession');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get session type from URL params or default to peerSession
  useEffect(() => {
    const type = searchParams.get('type') as 'studyRoom' | 'peerSession';
    if (type) {
      setSessionType(type);
    }
  }, [searchParams]);

  // Fetch session data
  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (sessionType === 'studyRoom') {
          // For study rooms, we need to get the room details
          // This would require a new API endpoint or modifying existing ones
          // For now, we'll use a placeholder
          setSessionData({
            id: sessionId,
            title: "Study Room Session",
            createdBy: { name: "Session Creator" },
            date: new Date().toISOString(),
          });
        } else {
          // For peer sessions, we can get the session details
          // This would require a new API endpoint to get individual session details
          setSessionData({
            id: sessionId,
            title: "Peer Session",
            requestedBy: { name: "Session Requester" },
            requestedTo: { name: "Session Peer" },
            date: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error("Error fetching session data:", err);
        setError("Failed to load session data");
        toast.error("Failed to load session data");
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchSessionData();
    }
  }, [sessionId, sessionType]);

  const handleReviewSuccess = () => {
    toast.success("Review submitted successfully!");
    router.push("/dashboard");
  };

  const handleReviewCancel = () => {
    router.push("/dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading session data...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <p className="text-destructive mb-4">{error || "Session not found"}</p>
              <Link href="/dashboard">
                <Button>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link href="/dashboard">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Submit Review</h1>
          <p className="text-muted-foreground">
            Share your experience and help others learn
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <ReviewForm
            sessionId={sessionId}
            sessionType={sessionType}
            sessionTitle={sessionData.title}
            revieweeName={
              sessionType === 'studyRoom' 
                ? sessionData.createdBy?.name || 'Session Creator'
                : sessionData.requestedTo?.name || 'Session Peer'
            }
            sessionDate={sessionData.date}
            onSuccess={handleReviewSuccess}
            onCancel={handleReviewCancel}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
