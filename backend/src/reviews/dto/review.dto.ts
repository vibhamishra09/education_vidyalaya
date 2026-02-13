import { IsString, IsInt, Min, Max, IsOptional } from 'class-validator';

export class ReviewDto {
  id: string;
  rating: number;
  review: string;
  reviewer: {
    id: string;
    name: string;
    avatar?: string;
  };
  reviewee: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export class ReviewCardDto {
  id: string;
  rating: number;
  review: string;
  reviewer: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export class CreateReviewDto {
  @IsString()
  sessionId: string;

  @IsString()
  sessionType: 'studyRoom' | 'peerSession';

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  review?: string;
}
