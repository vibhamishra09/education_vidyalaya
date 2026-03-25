import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateReviewDto } from './dto/review.dto';
import { NotifType, PaymentStatus } from '../generated/prisma/client';
import { CacheService } from '../redis/cache.service';
import { isConnectionError } from '../common/db-error-handler';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private readonly cacheService: CacheService,
  ) {}

  async getReviews(
    userId?: string,
    sessionId?: string,
    sessionType?: 'studyRoom' | 'peerSession',
    page: number = 1,
    limit: number = 10,
  ) {
    // Cache for 2 minutes - reviews change when new reviews are added
    const cacheKey = this.cacheService.createKey('reviews:list', {
      userId,
      sessionId,
      sessionType,
      page,
      limit,
    });
    const cacheTTL = 120;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        try {
          const where: any = {};

          if (userId) {
            // Check if userId is a clerkId or database ID
            // If it's a clerkId, convert to database ID
            const user = await this.prisma.user.findUnique({
              where: { clerkId: userId },
              select: { id: true },
            });

            if (user) {
              where.revieweeId = user.id;
            } else {
              // If not found by clerkId, assume it's already a database ID
              where.revieweeId = userId;
            }
          }
          if (sessionId) {
            if (sessionType === 'studyRoom') {
              where.studyRoomId = sessionId;
            } else if (sessionType === 'peerSession') {
              where.peerSessionId = sessionId;
            }
          }

          const skip = (page - 1) * limit;

          const [reviews, total] = await Promise.all([
            this.prisma.review.findMany({
              where,
              skip,
              take: limit,
              include: {
                reviewer: { select: { id: true, name: true, avatar: true } },
                reviewee: { select: { id: true, name: true, avatar: true } },
              },
              orderBy: { id: 'desc' },
            }),
            this.prisma.review.count({ where }),
          ]);

          return {
            reviews: reviews.map((r) => ({
              id: r.id,
              rating: r.rating,
              review: r.review,
              reviewer: r.reviewer,
              reviewee: r.reviewee,
            })),
            pagination: {
              total,
              page,
              limit,
              totalPages: Math.ceil(total / limit),
              hasMore: skip + limit < total,
            },
          };
        } catch (error) {
          // Handle database connection errors
          if (isConnectionError(error)) {
            this.logger.error(
              `Database connection error in getReviews:`,
              error instanceof Error ? error.message : String(error),
            );

            // Return empty reviews as fallback
            return {
              reviews: [],
              pagination: {
                total: 0,
                page,
                limit,
                totalPages: 0,
                hasMore: false,
              },
            };
          }

          // Re-throw other errors
          throw error;
        }
      },
      cacheTTL,
    );
  }

  async createReview(userId: string, createDto: CreateReviewDto) {
    // userId is actually clerkId, so we need to find the user by clerkId first
    const user = await this.prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if already reviewed
    const whereClause: any = {
      reviewerId: user.id, // Use the database ID, not clerkId
    };

    if (createDto.sessionType === 'studyRoom') {
      whereClause.studyRoomId = createDto.sessionId;
    } else {
      whereClause.peerSessionId = createDto.sessionId;
    }

    const existing = await this.prisma.review.findFirst({
      where: whereClause,
    });

    if (existing) {
      throw new ConflictException({
        code: 'ALREADY_REVIEWED',
        message: 'You have already reviewed this session',
      });
    }

    // Get session to determine reviewee
    let revieweeId: string;
    if (createDto.sessionType === 'studyRoom') {
      const studyRoom = await this.prisma.studyRoom.findUnique({
        where: { id: createDto.sessionId },
        include: { learners: { select: { userId: true } } },
      });

      if (!studyRoom) {
        throw new NotFoundException('Study room not found');
      }

      // Prevent reviews for NOT_COMPLETED or CANCELLED sessions
      if (studyRoom.sessionStatus === 'NOT_COMPLETED') {
        throw new ForbiddenException({
          code: 'SESSION_NOT_COMPLETED',
          message: 'Cannot review a session that was not completed',
        });
      }

      if (studyRoom.sessionStatus === 'CANCELLED') {
        throw new ForbiddenException({
          code: 'SESSION_CANCELLED',
          message: 'Cannot review a cancelled session',
        });
      }

      // Only allow reviews for DONE sessions
      if (studyRoom.sessionStatus !== 'DONE') {
        throw new ForbiddenException({
          code: 'SESSION_NOT_DONE',
          message: 'Can only review completed sessions',
        });
      }

      if (studyRoom.createdById === user.id) {
        throw new ForbiddenException(
          'Creators cannot review their own study rooms',
        );
      }

      const isLearner = studyRoom.learners.some(
        (learner) => learner.userId === user.id,
      );
      if (!isLearner) {
        throw new ForbiddenException(
          'Only learners can review this study room',
        );
      }

      revieweeId = studyRoom.createdById;
    } else {
      const peerSession = await this.prisma.peerSession.findUnique({
        where: { id: createDto.sessionId },
      });

      if (!peerSession) {
        throw new NotFoundException('Peer session not found');
      }

      // Prevent reviews for NOT_COMPLETED or CANCELLED sessions
      if (peerSession.sessionStatus === 'NOT_COMPLETED') {
        throw new ForbiddenException({
          code: 'SESSION_NOT_COMPLETED',
          message: 'Cannot review a session that was not completed',
        });
      }

      if (peerSession.sessionStatus === 'CANCELLED') {
        throw new ForbiddenException({
          code: 'SESSION_CANCELLED',
          message: 'Cannot review a cancelled session',
        });
      }

      // Only allow reviews for DONE sessions
      if (peerSession.sessionStatus !== 'DONE') {
        throw new ForbiddenException({
          code: 'SESSION_NOT_DONE',
          message: 'Can only review completed sessions',
        });
      }

      revieweeId =
        peerSession.requestedById === user.id
          ? peerSession.requestedToId
          : peerSession.requestedById;
    }

    const reviewData: any = {
      rating: createDto.rating,
      review: createDto.review?.trim() ?? '',
      reviewerId: user.id, // Use the database ID, not clerkId
      revieweeId,
    };

    if (createDto.sessionType === 'studyRoom') {
      reviewData.studyRoomId = createDto.sessionId;
    } else {
      reviewData.peerSessionId = createDto.sessionId;
    }

    const review = await this.prisma.review.create({
      data: reviewData,
      include: {
        reviewer: { select: { id: true, name: true, avatar: true } },
        reviewee: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Notify the reviewee about the new review
    await this.notificationsService.createAndPushNotification(
      revieweeId,
      `${review.reviewer.name} left you a ${review.rating}-star review`,
      'New Review Received',
      NotifType.NORMAL,
      {
        actionType: 'REVIEW_RECEIVED',
        actionData: {
          reviewId: review.id,
          rating: review.rating,
          sessionId: createDto.sessionId,
          sessionType: createDto.sessionType,
        },
      },
    );

    // Check if this review completes the session (both parties have reviewed)
    // and release escrow payment if applicable
    await this.checkAndReleaseEscrowPayment(
      createDto.sessionId,
      createDto.sessionType,
      user.id,
    );

    // Invalidate reviews cache
    await this.cacheService.deletePattern(`reviews:list*`);
    await this.cacheService.deletePattern(
      `reviews:session:*${createDto.sessionId}*`,
    );
    // Invalidate user profile cache (reviews affect user stats)
    await this.cacheService.deletePattern(`user:*${revieweeId}*`);

    return {
      id: review.id,
      rating: review.rating,
      review: review.review,
      reviewer: review.reviewer,
      reviewee: review.reviewee,
    };
  }

  async getSessionReviews(
    sessionId: string,
    sessionType: 'studyRoom' | 'peerSession',
    page: number = 1,
    limit: number = 10,
  ) {
    // Cache for 2 minutes - reviews change when new reviews are added
    const cacheKey = this.cacheService.createKey('reviews:session', {
      sessionId,
      sessionType,
      page,
      limit,
    });
    const cacheTTL = 120;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        try {
          const skip = (page - 1) * limit;

          const whereClause: any = {};
          if (sessionType === 'studyRoom') {
            whereClause.studyRoomId = sessionId;
          } else {
            whereClause.peerSessionId = sessionId;
          }

          const [reviews, total] = await Promise.all([
            this.prisma.review.findMany({
              where: whereClause,
              skip,
              take: limit,
              include: {
                reviewer: { select: { id: true, name: true, avatar: true } },
              },
              orderBy: { id: 'desc' },
            }),
            this.prisma.review.count({ where: whereClause }),
          ]);

          const avgRating =
            reviews.length > 0
              ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
              : 0;

          return {
            reviews: reviews.map((r) => ({
              id: r.id,
              rating: r.rating,
              review: r.review,
              reviewer: r.reviewer,
            })),
            avgRating: Math.round(avgRating * 10) / 10,
            totalCount: total,
            pagination: {
              total,
              page,
              limit,
              totalPages: Math.ceil(total / limit),
              hasMore: skip + limit < total,
            },
          };
        } catch (error) {
          // Handle database connection errors
          if (isConnectionError(error)) {
            this.logger.error(
              `Database connection error in getSessionReviews for session ${sessionId}:`,
              error instanceof Error ? error.message : String(error),
            );

            // Return empty reviews as fallback
            return {
              reviews: [],
              avgRating: 0,
              totalCount: 0,
              pagination: {
                total: 0,
                page,
                limit,
                totalPages: 0,
                hasMore: false,
              },
            };
          }

          // Re-throw other errors
          throw error;
        }
      },
      cacheTTL,
    );
  }

  private async checkAndReleaseEscrowPayment(
    sessionId: string,
    sessionType: 'studyRoom' | 'peerSession',
    reviewerId?: string,
  ) {
    if (sessionType === 'peerSession') {
      // For peer sessions, check if both parties have reviewed
      const peerSession = await this.prisma.peerSession.findUnique({
        where: { id: sessionId },
        include: {
          reviews: true,
          payments: true,
          requestedBy: true,
          requestedTo: true,
        },
      });

      if (!peerSession) return;

      // Check if both parties have reviewed
      const requesterReviewed = peerSession.reviews.some(
        (r) => r.reviewerId === peerSession.requestedById,
      );
      const peerReviewed = peerSession.reviews.some(
        (r) => r.reviewerId === peerSession.requestedToId,
      );

      // If both have reviewed, release escrow payment
      if (
        requesterReviewed &&
        peerReviewed &&
        peerSession.payments.length > 0
      ) {
        const payment = peerSession.payments[0];
        if (payment.paymentStatus === PaymentStatus.ESCROW) {
          await this.prisma.payment.update({
            where: { id: payment.id },
            data: { paymentStatus: PaymentStatus.RECEIVED },
          });

          await this.prisma.user.update({
            where: { id: peerSession.requestedToId },
            data: { coins: { increment: payment.amountReceived || 0 } },
          });

          // Notify the teacher that payment has been released
          await this.notificationsService.createAndPushNotification(
            peerSession.requestedToId,
            `Payment of ${Number(payment.amountReceived).toFixed(2)} Coins has been released from escrow for your session with ${peerSession.requestedBy.name}`,
            'Payment Released',
            NotifType.NORMAL,
            {
              actionType: 'PAYMENT_RELEASED',
              peerSessionId: sessionId,
              actionData: { sessionId, sessionType: 'peerSession' },
            },
          );
        }
      }
    } else if (sessionType === 'studyRoom') {
      // For study rooms, release payment when a learner reviews the creator
      const studyRoom = await this.prisma.studyRoom.findUnique({
        where: { id: sessionId },
        include: {
          reviews: true,
          payments: true,
          learners: true,
        },
      });

      if (!studyRoom) return;

      // If reviewerId is provided and it's a learner (not the creator), release their specific payment
      if (reviewerId && reviewerId !== studyRoom.createdById) {
        // Find the payment made by this learner
        const learnerPayment = studyRoom.payments.find(
          (p) =>
            p.madeById === reviewerId &&
            p.paymentStatus === PaymentStatus.ESCROW,
        );

        if (learnerPayment) {
          // Release this learner's payment
          await this.prisma.payment.update({
            where: { id: learnerPayment.id },
            data: { paymentStatus: PaymentStatus.RECEIVED },
          });

          await this.prisma.user.update({
            where: { id: studyRoom.createdById },
            data: { coins: { increment: learnerPayment.amountReceived || 0 } },
          });

          // Notify the creator that payment has been released
          await this.notificationsService.createAndPushNotification(
            studyRoom.createdById,
            `Payment of ${Number(learnerPayment.amountReceived).toFixed(2)} Coins has been released from escrow for your study room "${studyRoom.title}"`,
            'Payment Released',
            NotifType.NORMAL,
            {
              actionType: 'PAYMENT_RELEASED',
              studyRoomId: sessionId,
              actionData: { sessionId, sessionType: 'studyRoom' },
            },
          );
        }
      }
    }
  }
}
