import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Star } from 'lucide-react';
import type { ReviewCard } from '@/types/api.types';

interface ReviewCardProps {
  review: ReviewCard;
  showReviewee?: boolean;
}

export function ReviewCardComponent({ review }: ReviewCardProps) {
  const displayUser = review.reviewer;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={displayUser.avatar} alt={displayUser.name} />
            <AvatarFallback>{displayUser.name.charAt(0)}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div>
              <h4 className="font-semibold">{displayUser.name}</h4>
              <div className="flex items-center gap-1 mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < review.rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>

            <p className="mt-3 text-sm text-muted-foreground">{review.review}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
