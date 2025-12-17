"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";

interface Review {
  id: string;
  rating: number;
  review: string;
  reviewer: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface ProfileStatsChartProps {
  reviews: Review[];
  avgRating: number;
  sessionsTaught?: number;
  sessionsAttended?: number;
  className?: string;
}

// Simplified chart component for static build
export function ProfileStatsChart({
  reviews,
  avgRating,
  sessionsTaught = 0,
  sessionsAttended = 0,
}: ProfileStatsChartProps) {
  // Calculate rating distribution
  const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((r) => r.rating === rating).length,
  }));

  const totalReviews = reviews.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-amber-500" />
          Performance Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Average Rating */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Average Rating</span>
              <span className="text-2xl font-bold">{avgRating.toFixed(1)}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full"
                style={{ width: `${(avgRating / 5) * 100}%` }}
              />
            </div>
          </div>

          {/* Rating Distribution */}
          <div>
            <h4 className="text-sm font-medium mb-3">Rating Distribution</h4>
            <div className="space-y-2">
              {ratingDistribution.map(({ rating, count }) => (
                <div key={rating} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-20">
                    <span className="text-sm font-medium">{rating}</span>
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  </div>
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{
                        width: `${totalReviews > 0 ? (count / totalReviews) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-8 text-right">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Session Stats */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <p className="text-sm text-muted-foreground">Sessions Taught</p>
              <p className="text-2xl font-bold">{sessionsTaught}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sessions Attended</p>
              <p className="text-2xl font-bold">{sessionsAttended}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
