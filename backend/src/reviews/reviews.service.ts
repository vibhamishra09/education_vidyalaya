import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateReviewDto } from './dto/review.dto';
import { NotifType, PaymentStatus } from '@prisma/client';

@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async getReviews(
    userId?: string,
    sessionId?: string,
    sessionType?: 'studyRoom' | 'peerSession',
    page: number = 1,
    limit: number = 10,
  ) {
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
      });

      if (!studyRoom) {
        throw new NotFoundException('Study room not found');
      }

      revieweeId = studyRoom.createdById;
    } else {
      const peerSession = await this.prisma.peerSession.findUnique({
        where: { id: createDto.sessionId },
      });

      if (!peerSession) {
        throw new NotFoundException('Peer session not found');
      }

      revieweeId =
        peerSession.requestedById === user.id
          ? peerSession.requestedToId
          : peerSession.requestedById;
    }

    const reviewData: any = {
      rating: createDto.rating,
      review: createDto.review,
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
    await this.checkAndReleaseEscrowPayment(createDto.sessionId, createDto.sessionType);

    return {
      id: review.id,
      rating: review.rating,
      review: review.review,
      reviewer: review.reviewer,
      reviewee: review.reviewee,
    };
  }

  async getSessionReviews(sessionId: string, sessionType: 'studyRoom' | 'peerSession', page: number = 1, limit: number = 10) {
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
  }

  private async checkAndReleaseEscrowPayment(sessionId: string, sessionType: 'studyRoom' | 'peerSession') {
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
        (r) => r.reviewerId === peerSession.requestedById
      );
      const peerReviewed = peerSession.reviews.some(
        (r) => r.reviewerId === peerSession.requestedToId
      );

      // If both have reviewed, release escrow payment
      if (requesterReviewed && peerReviewed && peerSession.payments.length > 0) {
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
            `Payment of ${Number(payment.amountReceived).toFixed(2)} coins has been released from escrow for your session with ${peerSession.requestedBy.name}`,
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
      // For study rooms, check if all participants have reviewed
      const studyRoom = await this.prisma.studyRoom.findUnique({
        where: { id: sessionId },
        include: {
          reviews: true,
          payments: true,
          learners: true,
        },
      });

      if (!studyRoom) return;

      // Get all participant IDs (creator + learners)
      const allParticipantIds = [
        studyRoom.createdById,
        ...studyRoom.learners.map((l) => l.userId),
      ];

      // Check if all participants have reviewed
      const reviewedParticipantIds = studyRoom.reviews.map((r) => r.reviewerId);
      const allReviewed = allParticipantIds.every((id) =>
        reviewedParticipantIds.includes(id)
      );

      // If all have reviewed, release escrow payments
      if (allReviewed) {
        for (const payment of studyRoom.payments) {
          if (payment.paymentStatus === PaymentStatus.ESCROW) {
            await this.prisma.payment.update({
              where: { id: payment.id },
              data: { paymentStatus: PaymentStatus.RECEIVED },
            });

            await this.prisma.user.update({
              where: { id: studyRoom.createdById },
              data: { coins: { increment: payment.amountReceived || 0 } },
            });

            // Notify the creator that payment has been released
            await this.notificationsService.createAndPushNotification(
              studyRoom.createdById,
              `Payment of ${Number(payment.amountReceived).toFixed(2)} coins has been released from escrow for your study room "${studyRoom.title}"`,
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
}
