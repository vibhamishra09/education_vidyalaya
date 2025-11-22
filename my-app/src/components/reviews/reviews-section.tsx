"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MessageSquare, TrendingUp } from "lucide-react";
import { ReviewCardComponent } from "@/components/cards/review-card";
import { useSessionReviews } from "@/hooks/use-reviews";

interface ReviewsSectionProps {
  sessionId: string;
  showTitle?: boolean;
  maxReviews?: number;
}

export function ReviewsSection({
  sessionId,
  showTitle = true,
  maxReviews = 3,
}: ReviewsSectionProps) {
  const [showAll, setShowAll] = useState(false);
  
  const { data: reviewsData, isLoading, error } = useSessionReviews(sessionId);
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Failed to load reviews</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!reviewsData || reviewsData.reviews.length === 0) {
    return (
      <Card>
        <CardHeader>
          {showTitle && <CardTitle>Reviews</CardTitle>}
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No reviews yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Be the first to share your experience!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { reviews, avgRating, totalCount } = reviewsData;
  const displayedReviews = showAll ? reviews : reviews.slice(0, maxReviews);
  const hasMoreReviews = reviews.length > maxReviews;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          {showTitle && <CardTitle>Reviews</CardTitle>}
          <div className="flex items-center gap-4">
            {/* Average Rating */}
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <span className="ml-1 font-semibold">{avgRating.toFixed(1)}</span>
              </div>
              <Badge variant="secondary" className="gap-1">
                <TrendingUp className="h-3 w-3" />
                {totalCount} review{totalCount !== 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Reviews List */}
        <div className="space-y-4">
          {displayedReviews.map((review) => (
            <ReviewCardComponent key={review.id} review={review} />
          ))}
        </div>

        {/* Show More/Less Button */}
        {hasMoreReviews && (
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowAll(!showAll)}
              className="w-full"
            >
              {showAll ? 'Show Less' : `Show All ${totalCount} Reviews`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
