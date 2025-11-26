"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2 } from "lucide-react";
import { useCreateReview } from "@/hooks/use-reviews";
import { CreateReviewDto } from "@/types/api.types";
import { toast } from "sonner";

interface ReviewFormProps {
  sessionId: string;
  sessionType: 'studyRoom' | 'peerSession';
  sessionTitle: string;
  revieweeName: string;
  sessionDate: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ReviewForm({
  sessionId,
  sessionType,
  sessionTitle,
  revieweeName,
  sessionDate,
  onSuccess,
  onCancel,
}: ReviewFormProps) {
  const router = useRouter();
  const createReviewMutation = useCreateReview();
  
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0 || review.length < 1) {
      toast.error("Please provide a rating and at least 1 character for your review");
      return;
    }

    try {
      const reviewData: CreateReviewDto = {
        sessionId,
        sessionType,
        rating,
        review: review.trim(),
      };

      await createReviewMutation.mutateAsync(reviewData);
      
      toast.success("Review submitted successfully!");
      
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/dashboard");
      }
    } catch (error: unknown) {
      console.error("Error submitting review:", error);
      
      const errorMessage = error && typeof error === 'object' && 'response' in error 
        ? (error as { response?: { data?: { message?: string; code?: string } } }).response?.data?.message || "Failed to submit review"
        : "Failed to submit review";
      
      const errorCode = error && typeof error === 'object' && 'response' in error 
        ? (error as { response?: { data?: { code?: string } } }).response?.data?.code
        : undefined;
      
      if (errorCode === 'ALREADY_REVIEWED') {
        toast.error("You have already reviewed this session");
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rate Your Experience</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Session Info */}
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-1">{sessionTitle}</h3>
            <p className="text-sm text-muted-foreground">
              with {revieweeName} • Completed on {new Date(sessionDate).toLocaleDateString()}
            </p>
          </div>

          {/* Rating */}
          <div className="space-y-2">
            <Label>Rating *</Label>
            <div className="flex gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRating(i + 1)}
                  onMouseEnter={() => setHoveredRating(i + 1)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="focus:outline-none transition-transform hover:scale-110"
                  disabled={createReviewMutation.isPending}
                >
                  <Star
                    className={`h-10 w-10 transition-colors ${
                      i < (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm text-muted-foreground">
                {rating === 1 && "Poor"}
                {rating === 2 && "Fair"}
                {rating === 3 && "Good"}
                {rating === 4 && "Very Good"}
                {rating === 5 && "Excellent"}
              </p>
            )}
          </div>

          {/* Review */}
          <div className="space-y-2">
            <Label htmlFor="review">Review *</Label>
            <Textarea
              id="review"
              placeholder="Share your experience, what you learned, and how the session helped you..."
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={6}
              required
              disabled={createReviewMutation.isPending}
            />
          </div>

          {/* Tips */}
          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
            <h4 className="font-semibold mb-2 text-sm">
              Tips for a helpful review:
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Be specific about what you learned</li>
              <li>• Mention the teaching style and clarity</li>
              <li>• Comment on the session organization</li>
              <li>• Be respectful and constructive</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleCancel}
              disabled={createReviewMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={rating === 0 || review.length < 1 || createReviewMutation.isPending}
            >
              {createReviewMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Review"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
