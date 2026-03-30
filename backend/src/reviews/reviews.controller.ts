import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateReviewDto } from './dto/review.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';

@Controller('api/reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Get()
  async getReviews(
    @Query('userId') userId?: string,
    @Query('sessionId') sessionId?: string,
    @Query('sessionType') sessionType?: 'studyRoom' | 'peerSession',
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reviewsService.getReviews(
      userId,
      sessionId,
      sessionType,
      page || 1,
      limit || 10,
    );
  }

  @Post()
  @UseGuards(ClerkAuthGuard)
  async createReview(
    @CurrentUser('dbUserId') dbUserId: string | undefined,
    @CurrentUser('clerkId') clerkUserId: string,
    @Body() createDto: CreateReviewDto,
  ) {
    const actorKey = dbUserId ?? clerkUserId;
    if (!actorKey) {
      throw new UnauthorizedException('User identity missing');
    }
    return this.reviewsService.createReview(actorKey, createDto);
  }

  @Get('sessions/:sessionId/reviews')
  async getSessionReviews(
    @Param('sessionId') sessionId: string,
    @Query('sessionType') sessionType: 'studyRoom' | 'peerSession',
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reviewsService.getSessionReviews(
      sessionId,
      sessionType,
      page || 1,
      limit || 10,
    );
  }
}
