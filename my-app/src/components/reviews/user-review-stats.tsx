"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Users } from "lucide-react";
import { useReviews } from "@/hooks/use-reviews";

interface UserReviewStatsProps {
  userId: string;
  showTitle?: boolean;
}

export function UserReviewStats({ userId, showTitle = true }: UserReviewStatsProps) {
  const { data: reviewsData, isLoading, error } = useReviews({ userId });

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

  if (error || !reviewsData || reviewsData.reviews.length === 0) {
    return (
      <Card>
        <CardHeader>
          {showTitle && <CardTitle>Reviews</CardTitle>}
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No reviews yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { reviews } = reviewsData;
  const totalReviews = reviews.length;
  const avgRating = reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews;
  
  // Calculate rating distribution
  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: reviews.filter(r => r.rating === rating).length,
    percentage: (reviews.filter(r => r.rating === rating).length / totalReviews) * 100,
  }));

  return (
    <Card>
      <CardHeader>
        {showTitle && <CardTitle>Review Statistics</CardTitle>}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              <span className="text-2xl font-bold">{avgRating.toFixed(1)}</span>
            </div>
            <p className="text-sm text-muted-foreground">Average Rating</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{totalReviews}</span>
            </div>
            <p className="text-sm text-muted-foreground">Total Reviews</p>
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Rating Distribution</h4>
          {ratingDistribution.map(({ rating, count, percentage }) => (
            <div key={rating} className="flex items-center gap-3">
              <div className="flex items-center gap-1 w-8">
                <span className="text-sm font-medium">{rating}</span>
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              </div>
              <div className="flex-1 bg-muted rounded-full h-2">
                <div
                  className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="flex items-center gap-2 w-16">
                <span className="text-sm text-muted-foreground">{count}</span>
                <Badge variant="secondary" className="text-xs">
                  {percentage.toFixed(0)}%
                </Badge>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Reviews Preview */}
        {reviews.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Recent Reviews</h4>
            <div className="space-y-2">
              {reviews.slice(0, 3).map((review) => (
                <div key={review.id} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${
                          i < review.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-clamp-2">{review.review}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      by {review.reviewer.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
