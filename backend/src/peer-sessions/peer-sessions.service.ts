import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  RequestSessionDto,
  UpdateSessionStatusDto,
  UpdatePeerSessionDto,
} from './dto/peer-session.dto';
import { SessionFeedbackDto } from '../common/dto/session-feedback.dto';
import { SessionStatus, PaymentStatus, NotifType, Prisma } from '../generated/prisma/client';
import {
  normalizeGoogleMeetLink,
  isValidGoogleMeetLink,
} from '../utils/gmeet-generator';
import { ChatService } from '../chat/chat.service';
import { convertLocalToUTC } from '../utils/timezone';
import { AvailabilityService } from '../availability/availability.service';
import { StreaksService } from '../streaks/streaks.service';
import { AchievementsService } from '../achievements/achievements.service';
import { TranscriptsService } from '../transcripts/transcripts.service';
import { CacheService } from '../redis/cache.service';
import { isConnectionError } from '../common/db-error-handler';

@Injectable()
export class PeerSessionsService {
  private readonly logger = new Logger(PeerSessionsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private chatService: ChatService,
    private availabilityService: AvailabilityService,
    private streaksService: StreaksService,
    private achievementsService: AchievementsService,
    private transcriptsService: TranscriptsService,
    private readonly cacheService: CacheService,
  ) {}

  async getPeerSessions(
    userId: string,
    status?: SessionStatus,
    requestedBy?: string,
    requestedTo?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    // Cache for 30 seconds - sessions change when status updates
    const cacheKey = this.cacheService.createKey('peer-sessions:list', {
      userId,
      status,
      requestedBy,
      requestedTo,
      page,
      limit,
    });
    const cacheTTL = 30;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        try {
          this.logger.debug('userId', userId);
          // userId is actually clerkId, so we need to find the user by clerkId first
          const user = await this.prisma.user.findUnique({
          where: { clerkId: userId },
          select: { id: true },
        });

        if (!user) {
          throw new BadRequestException({
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          });
        }

        const where: any = {
          OR: [{ requestedById: user.id }, { requestedToId: user.id }],
        };

        if (status) where.sessionStatus = status;
        if (requestedBy) where.requestedById = requestedBy;
        if (requestedTo) where.requestedToId = requestedTo;

        const skip = (page - 1) * limit;

        // Sort by scheduled time (date) - ascending: earliest scheduled time first
        const orderBy = { date: 'asc' as const };

        const [peerSessions, total] = await Promise.all([
          this.prisma.peerSession.findMany({
            where,
            skip,
            take: limit,
            include: {
              requestedBy: { select: { id: true, name: true, avatar: true } },
              requestedTo: { select: { id: true, name: true, avatar: true } },
              skills: { include: { skill: { select: { id: true, name: true } } } },
            },
            orderBy,
          }),
          this.prisma.peerSession.count({ where }),
        ]);

        // Auto-expire sessions that have passed their scheduled end time
        const now = new Date();
        const expiredSessions = peerSessions.filter((ps) => {
          const sessionEndTime = new Date(ps.date.getTime() + ps.duration * 60000);
          const isExpired = sessionEndTime < now;
          const isNotInTerminalState = !['DONE', 'CANCELLED', 'NOT_COMPLETED'].includes(ps.sessionStatus);
          return isExpired && isNotInTerminalState;
        });

        // Process expired sessions (no payment processing - payments are only processed after reviews)
        for (const session of expiredSessions) {
          this.logger.debug('⏰ [getPeerSessions] Auto-expiring session:', {
            sessionId: session.id,
            scheduledEnd: new Date(session.date.getTime() + session.duration * 60000).toISOString(),
            currentStatus: session.sessionStatus,
          });

          // Update status to NOT_COMPLETED
          await this.prisma.peerSession.update({
            where: { id: session.id },
            data: { sessionStatus: SessionStatus.NOT_COMPLETED },
          });

          // Invalidate cache for both users' session lists
          await this.cacheService.deletePattern(`peer-sessions:list:*${session.requestedById}*`);
          await this.cacheService.deletePattern(`peer-sessions:list:*${session.requestedToId}*`);

          // Notify both parties
          await this.notificationsService.createAndPushNotification(
            session.requestedById,
            `Your session with ${session.requestedTo.name} has expired and was not completed.`,
            'Session Expired',
            NotifType.NORMAL,
            {
              actionType: 'SESSION_EXPIRED',
              peerSessionId: session.id,
              actionData: { sessionId: session.id, sessionType: 'peerSession' },
            },
          );

          await this.notificationsService.createAndPushNotification(
            session.requestedToId,
            `Your session with ${session.requestedBy.name} has expired and was not completed.`,
            'Session Expired',
            NotifType.NORMAL,
            {
              actionType: 'SESSION_EXPIRED',
              peerSessionId: session.id,
              actionData: { sessionId: session.id, sessionType: 'peerSession' },
            },
          );

        // Update the status in the returned list
        session.sessionStatus = SessionStatus.NOT_COMPLETED;
      }

      return {
        peerSessions: peerSessions.map((ps) => ({
          id: ps.id,
          title: ps.title,
          description: ps.description,
          sessionStatus: ps.sessionStatus,
          date: ps.date,
          duration: ps.duration,
          gmeetLink: ps.gmeetLink,
          requestedBy: ps.requestedBy,
          requestedTo: ps.requestedTo,
          skills: ps.skills.map((s) => s.skill),
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
              `Database connection error in getPeerSessions for user ${userId}:`,
              error instanceof Error ? error.message : String(error),
            );
            
            // Re-throw BadRequestException (user not found is a valid case)
            if (error instanceof BadRequestException) {
              throw error;
            }
            
            // Return empty sessions as fallback
            return {
              peerSessions: [],
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

  async getPeerSessionDetails(peerSessionId: string, userId?: string) {
    try {
      let peerSession = await this.prisma.peerSession.findUnique({
      where: { id: peerSessionId },
      include: {
        requestedBy: {
          select: { id: true, name: true, avatar: true, clerkId: true },
        },
        requestedTo: {
          select: { id: true, name: true, avatar: true, clerkId: true },
        },
        skills: { include: { skill: { select: { id: true, name: true } } } },
      },
    });

    if (!peerSession) {
      throw new NotFoundException('Peer session not found');
    }

    // Auto-mark as NOT_COMPLETED if session time has passed and not in terminal state
    const now = new Date();
    const sessionEndTime = new Date(peerSession.date.getTime() + peerSession.duration * 60000);
    const isExpired = sessionEndTime < now;
    const isNotInTerminalState = !['DONE', 'CANCELLED', 'NOT_COMPLETED'].includes(peerSession.sessionStatus);

    if (isExpired && isNotInTerminalState) {
      this.logger.debug('⏰ [getPeerSessionDetails] Session expired, marking as NOT_COMPLETED:', {
        sessionId: peerSessionId,
        scheduledEnd: sessionEndTime.toISOString(),
        currentTime: now.toISOString(),
        currentStatus: peerSession.sessionStatus,
      });

      // Update session status to NOT_COMPLETED
      peerSession = await this.prisma.peerSession.update({
        where: { id: peerSessionId },
        data: { sessionStatus: SessionStatus.NOT_COMPLETED },
        include: {
          requestedBy: {
            select: { id: true, name: true, avatar: true, clerkId: true },
          },
          requestedTo: {
            select: { id: true, name: true, avatar: true, clerkId: true },
          },
          skills: { include: { skill: { select: { id: true, name: true } } } },
        },
      });

      // Notify both parties (no payment processing since payments are only processed after reviews)
      await this.notificationsService.createAndPushNotification(
        peerSession.requestedById,
        `Your session with ${peerSession.requestedTo.name} has expired and was not completed.`,
        'Session Expired',
        NotifType.NORMAL,
        {
          actionType: 'SESSION_EXPIRED',
          peerSessionId: peerSession.id,
          actionData: { sessionId: peerSession.id, sessionType: 'peerSession' },
        },
      );

      await this.notificationsService.createAndPushNotification(
        peerSession.requestedToId,
        `Your session with ${peerSession.requestedBy.name} has expired and was not completed.`,
        'Session Expired',
        NotifType.NORMAL,
        {
          actionType: 'SESSION_EXPIRED',
          peerSessionId: peerSession.id,
          actionData: { sessionId: peerSession.id, sessionType: 'peerSession' },
        },
      );
    }

    // Determine user role in the session
    let role: 'requester' | 'requestedTo' | 'empty' = 'empty';
    if (userId) {
      // userId is actually clerkId
      if (peerSession.requestedBy.clerkId === userId) {
        role = 'requester';
      } else if (peerSession.requestedTo.clerkId === userId) {
        role = 'requestedTo';
      }
    }

    // find existing chat channel if any
    const channel = await this.prisma.channel.findFirst({
      where: { externalType: 'peerSession', externalId: peerSession.id } as any,
      select: { id: true },
    });

    this.logger.debug('📊 [getPeerSessionDetails] Returning session data:', {
      id: peerSession.id,
      date: peerSession.date,
      dateISO: peerSession.date.toISOString(),
      duration: peerSession.duration,
      sessionStatus: peerSession.sessionStatus,
    });

    return {
      id: peerSession.id,
      title: peerSession.title,
      description: peerSession.description,
      sessionStatus: peerSession.sessionStatus,
      date: peerSession.date.toISOString(), // Ensure ISO string format
      duration: peerSession.duration,
      gmeetLink: peerSession.gmeetLink,
      summary: peerSession.summary,
      requestedBy: {
        id: peerSession.requestedBy.id,
        name: peerSession.requestedBy.name,
        avatar: peerSession.requestedBy.avatar,
      },
      requestedTo: {
        id: peerSession.requestedTo.id,
        name: peerSession.requestedTo.name,
        avatar: peerSession.requestedTo.avatar,
      },
      skills: peerSession.skills.map((s) => s.skill),
      chatChannelId: channel?.id ?? null,
      role,
      hostDetailsUpdatedAt: peerSession.hostDetailsUpdatedAt
        ? peerSession.hostDetailsUpdatedAt.toISOString()
        : null,
      lastDetailsEditedById: peerSession.lastDetailsEditedById ?? null,
    };
    } catch (error) {
      // Handle database connection errors
      if (isConnectionError(error)) {
        this.logger.error(
          `Database connection error in getPeerSessionDetails for session ${peerSessionId}:`,
          error instanceof Error ? error.message : String(error),
        );
        
        // Re-throw NotFoundException (session not found is a valid case)
        if (error instanceof NotFoundException) {
          throw error;
        }
        
        // For connection errors, throw a more user-friendly error
        throw new NotFoundException(
          'Unable to fetch session details. Please try again later.',
        );
      }
      
      // Re-throw other errors
      throw error;
    }
  }

  async requestPeerSession(userId: string, requestDto: RequestSessionDto) {
    // userId is actually clerkId, so we need to find the user by clerkId
    const user = await this.prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      throw new BadRequestException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    const peer = await this.prisma.user.findUnique({
      where: { id: requestDto.peerId },
    });

    if (!peer) {
      throw new NotFoundException('Peer not found');
    }

    // Prevent users from requesting sessions to themselves
    if (user.id === peer.id) {
      throw new BadRequestException({
        code: 'CANNOT_REQUEST_SELF',
        message: 'You cannot request a session to yourself',
      });
    }

    if (parseFloat(user.coins.toString()) < requestDto.cost) {
      throw new BadRequestException({
        code: 'INSUFFICIENT_FUNDS',
        message: 'Not enough Coins',
      });
    }

    // Convert user's local time to UTC
    // Example: 11 AM IST -> 5:30 AM UTC
    const dateTime = convertLocalToUTC(
      requestDto.date,
      requestDto.time,
      requestDto.timezone,
    );

    // Validate that session is not scheduled in the past
    const now = new Date();

    if (dateTime.getTime() < now.getTime()) {
      throw new BadRequestException({
        code: 'PAST_TIME_NOT_ALLOWED',
        message: 'Sessions cannot be scheduled in the past',
      });
    }

    // Check if the peer is available at the requested time
    const availabilityCheck =
      await this.availabilityService.checkTimeSlotAvailability(
        peer.id,
        dateTime,
        requestDto.duration,
      );

    // if (!availabilityCheck.isAvailable) {
    //   throw new BadRequestException({
    //     code: 'TIME_SLOT_UNAVAILABLE',
    //     message: availabilityCheck.reason || 'The requested time slot is not available',
    //     conflicts: availabilityCheck.conflicts,
    //   });
    // }

    // Normalize Google Meet link if provided
    const gmeetLink = requestDto.gmeetLink
      ? normalizeGoogleMeetLink(requestDto.gmeetLink)
      : null;

    const peerSession = await this.prisma.peerSession.create({
      data: {
        title: `Peer Session with ${peer.name}`,
        description: requestDto.message,
        date: dateTime,
        duration: requestDto.duration,
        sessionStatus: SessionStatus.PENDING, // Start as PENDING, not UPCOMING
        requestedById: user.id, // Use the database ID, not clerkId
        requestedToId: requestDto.peerId,
        gmeetLink: gmeetLink,
      },
    });

    // Add skills - if no skills provided, default to "Communication"
    const skillsToAdd =
      requestDto.skills && requestDto.skills.length > 0
        ? requestDto.skills
        : ['Communication'];

    for (const skillName of skillsToAdd) {
      const skill = await this.prisma.skill.findUnique({
        where: { name: skillName },
      });

      if (skill) {
        await this.prisma.peerSessionSkill.create({
          data: {
            peerSessionId: peerSession.id,
            skillId: skill.id,
          },
        });
      }
    }

    // Create payment in escrow
    const payment = await this.prisma.payment.create({
      data: {
        madeById: user.id, // Use the database ID, not clerkId
        receivedById: requestDto.peerId,
        peerSessionId: peerSession.id,
        amountMade: requestDto.cost,
        amountReceived: requestDto.cost,
        paymentStatus: PaymentStatus.ESCROW,
      },
    });

    // Deduct coins from user
    await this.prisma.user.update({
      where: { id: user.id }, // Use the database ID, not clerkId
      data: { coins: { decrement: requestDto.cost } },
    });

    // Send notification to the peer
    await this.notificationsService.createAndPushNotification(
      requestDto.peerId,
      `${user.name} has requested a peer session with you`,
      'New Session Request',
      NotifType.URGENT,
      {
        actionType: 'SESSION_REQUEST',
        peerSessionId: peerSession.id,
        actionData: { sessionId: peerSession.id, sessionType: 'peerSession' },
      },
    );

    return {
      ...(await this.getPeerSessionDetails(peerSession.id)),
      payment: {
        id: payment.id,
        amount: payment.amountMade,
        status: payment.paymentStatus,
      },
    };
  }

  async updatePeerSessionStatus(
    peerSessionId: string,
    userId: string,
    updateDto: UpdateSessionStatusDto,
  ) {
    // userId is actually clerkId, so we need to find the user by clerkId first
    const user = await this.prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!user) {
      throw new BadRequestException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    const peerSession = await this.prisma.peerSession.findUnique({
      where: { id: peerSessionId },
      include: {
        payments: true,
        requestedBy: true,
        requestedTo: true,
      },
    });

    if (!peerSession) {
      throw new NotFoundException('Peer session not found');
    }

    // Validate status transitions
    this.validateStatusTransition(
      peerSession.sessionStatus,
      updateDto.status,
      user.id,
      peerSession,
    );

    const updatedSession = await this.prisma.peerSession.update({
      where: { id: peerSessionId },
      data: { sessionStatus: updateDto.status },
    });

    // Invalidate cache for both users' session lists
    await this.cacheService.deletePattern(`peer-sessions:list:*${peerSession.requestedById}*`);
    await this.cacheService.deletePattern(`peer-sessions:list:*${peerSession.requestedToId}*`);

    // Handle payment based on status
    if (
      updateDto.status === SessionStatus.DONE &&
      peerSession.payments.length > 0
    ) {
      const payment = peerSession.payments[0];
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { paymentStatus: PaymentStatus.RECEIVED },
      });

      await this.prisma.user.update({
        where: { id: peerSession.requestedToId },
        data: { coins: { increment: payment.amountReceived || 0 } },
      });

      // Track activity and update streaks for both learner and teacher
      const coinsEarned = Number(payment.amountReceived || 0);

      // Update learner's activity (requestedBy is the learner)
      await this.streaksService.updateUserActivity(
        peerSession.requestedById,
        peerSession.date,
        peerSession.duration,
        'learner',
        Number(payment.amountMade),
      );

      // Update teacher's activity (requestedTo is the teacher)
      await this.streaksService.updateUserActivity(
        peerSession.requestedToId,
        peerSession.date,
        peerSession.duration,
        'teacher',
        coinsEarned,
      );

      // Check and update achievements for both users
      await this.achievementsService.checkSessionAchievements(
        peerSession.requestedById,
        'learner',
      );

      await this.achievementsService.checkSessionAchievements(
        peerSession.requestedToId,
        'teacher',
      );

      // Check streak achievements
      const learnerStreak = await this.streaksService.getUserStreak(
        peerSession.requestedById,
      );
      const teacherStreak = await this.streaksService.getUserStreak(
        peerSession.requestedToId,
      );

      await this.achievementsService.checkStreakAchievements(
        peerSession.requestedById,
        learnerStreak.currentStreak,
      );

      await this.achievementsService.checkStreakAchievements(
        peerSession.requestedToId,
        teacherStreak.currentStreak,
      );

      // Generate AI summary from transcripts
      try {
        this.logger.debug(
          '🤖 [completePeerSession] Generating AI summary for peer session:',
          peerSessionId,
        );
        const summary =
          await this.transcriptsService.compileAndSummarize(peerSessionId);

        // Store summary in database
        await this.prisma.peerSession.update({
          where: { id: peerSessionId },
          data: { summary },
        });
        this.logger.debug(
          '✅ [completePeerSession] AI summary generated and stored successfully',
        );
      } catch (error) {
        this.logger.debug(
          '⚠️ [completePeerSession] Failed to generate summary:',
          error,
        );
        // Continue execution even if summary generation fails
      }

      // Notify both parties to leave reviews
      await this.notificationsService.createAndPushNotification(
        peerSession.requestedById,
        `Your session with ${peerSession.requestedTo.name} is complete. Please leave a review!`,
        'Session Complete - Leave Review',
        NotifType.URGENT,
        {
          actionType: 'SESSION_COMPLETE_REVIEW',
          peerSessionId: peerSession.id,
          actionData: { sessionId: peerSession.id, sessionType: 'peerSession' },
        },
      );

      await this.notificationsService.createAndPushNotification(
        peerSession.requestedToId,
        `Your session with ${peerSession.requestedBy.name} is complete. Please leave a review!`,
        'Session Complete - Leave Review',
        NotifType.URGENT,
        {
          actionType: 'SESSION_COMPLETE_REVIEW',
          peerSessionId: peerSession.id,
          actionData: { sessionId: peerSession.id, sessionType: 'peerSession' },
        },
      );
    } else if (
      updateDto.status === SessionStatus.CANCELLED &&
      peerSession.payments.length > 0
    ) {
      const payment = peerSession.payments[0];
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { paymentStatus: PaymentStatus.REFUNDED },
      });

      await this.prisma.user.update({
        where: { id: peerSession.requestedById },
        data: { coins: { increment: payment.amountMade } },
      });

      // Notify the other party about cancellation
      const otherPartyId =
        user.id === peerSession.requestedById
          ? peerSession.requestedToId
          : peerSession.requestedById;
      const otherPartyName =
        user.id === peerSession.requestedById
          ? peerSession.requestedTo.name
          : peerSession.requestedBy.name;

      await this.notificationsService.createAndPushNotification(
        otherPartyId,
        `Your session with ${otherPartyName} has been cancelled`,
        'Session Cancelled',
        NotifType.URGENT,
        {
          actionType: 'SESSION_CANCELLED',
          peerSessionId: peerSession.id,
          actionData: { sessionId: peerSession.id, sessionType: 'peerSession' },
        },
      );
    } else if (updateDto.status === SessionStatus.UPCOMING) {
      // Autocreate 1-1 chat channel for this session
      const channel =
        await this.chatService.getOrCreateDirectChannelForPeerSession(
          peerSession.id,
          peerSession.requestedById,
          peerSession.requestedToId,
        );
      // Session accepted - notify the requester
      await this.notificationsService.createAndPushNotification(
        peerSession.requestedById,
        `${peerSession.requestedTo.name} has accepted your session request`,
        'Session Accepted',
        NotifType.NORMAL,
        {
          actionType: 'SESSION_ACCEPTED',
          peerSessionId: peerSession.id,
          actionData: { sessionId: peerSession.id, sessionType: 'peerSession' },
        },
      );
    }

    return this.getPeerSessionDetails(peerSessionId);
  }

  // Convenience method to accept a peer session request
  async acceptPeerSession(peerSessionId: string, userId: string) {
    return this.updatePeerSessionStatus(peerSessionId, userId, {
      status: SessionStatus.UPCOMING,
    });
  }

  // Convenience method to reject/cancel a peer session request
  async rejectPeerSession(peerSessionId: string, userId: string) {
    return this.updatePeerSessionStatus(peerSessionId, userId, {
      status: SessionStatus.CANCELLED,
    });
  }

  // Convenience method to mark a session as done
  async completePeerSession(peerSessionId: string, userId: string) {
    return this.updatePeerSessionStatus(peerSessionId, userId, {
      status: SessionStatus.DONE,
    });
  }

  // Mark session as not completed (time expired without proper completion)
  // This refunds payment and doesn't trigger review prompts
  async markNotCompleted(peerSessionId: string, userId: string) {
    this.logger.debug('⏱️ [markNotCompleted] Marking session as NOT_COMPLETED:', { peerSessionId, userId });
    
    // userId is actually clerkId
    const user = await this.prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!user) {
      throw new BadRequestException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    const peerSession = await this.prisma.peerSession.findUnique({
      where: { id: peerSessionId },
      include: {
        payments: true,
        requestedBy: { select: { id: true, name: true } },
        requestedTo: { select: { id: true, name: true } },
      },
    });

    if (!peerSession) {
      throw new NotFoundException('Peer session not found');
    }

    // Only participants can mark as not completed
    if (peerSession.requestedById !== user.id && peerSession.requestedToId !== user.id) {
      throw new ForbiddenException('Only session participants can mark session as not completed');
    }

    // Update session status
    await this.prisma.peerSession.update({
      where: { id: peerSessionId },
      data: { sessionStatus: SessionStatus.NOT_COMPLETED },
    });

    // Refund payment if exists
    if (peerSession.payments.length > 0) {
      const payment = peerSession.payments[0];
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { paymentStatus: PaymentStatus.REFUNDED },
      });

      await this.prisma.user.update({
        where: { id: peerSession.requestedById },
        data: { coins: { increment: payment.amountMade } },
      });

      this.logger.debug('💰 [markNotCompleted] Payment refunded:', payment.amountMade.toString());
    }

    // Notify both parties (no review prompt)
    await this.notificationsService.createAndPushNotification(
      peerSession.requestedById,
      `Your session with ${peerSession.requestedTo.name} was not completed properly. Payment has been refunded.`,
      'Session Not Completed',
      NotifType.NORMAL,
      {
        actionType: 'SESSION_NOT_COMPLETED',
        peerSessionId: peerSession.id,
        actionData: { sessionId: peerSession.id, sessionType: 'peerSession' },
      },
    );

    await this.notificationsService.createAndPushNotification(
      peerSession.requestedToId,
      `Your session with ${peerSession.requestedBy.name} was not completed properly.`,
      'Session Not Completed',
      NotifType.NORMAL,
      {
        actionType: 'SESSION_NOT_COMPLETED',
        peerSessionId: peerSession.id,
        actionData: { sessionId: peerSession.id, sessionType: 'peerSession' },
      },
    );

    this.logger.debug('✅ [markNotCompleted] Session marked as NOT_COMPLETED');
    return { success: true, message: 'Session marked as not completed' };
  }

  private validateStatusTransition(
    currentStatus: SessionStatus,
    newStatus: SessionStatus,
    userId: string,
    peerSession: any,
  ) {
    // Define valid status transitions
    const validTransitions = {
      [SessionStatus.PENDING]: [
        SessionStatus.UPCOMING,
        SessionStatus.CANCELLED,
      ],
      [SessionStatus.UPCOMING]: [SessionStatus.DONE, SessionStatus.CANCELLED, SessionStatus.NOT_COMPLETED],
      [SessionStatus.DONE]: [], // No transitions from DONE
      [SessionStatus.CANCELLED]: [], // No transitions from CANCELLED
      [SessionStatus.NOT_COMPLETED]: [], // No transitions from NOT_COMPLETED
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException({
        code: 'INVALID_STATUS_TRANSITION',
        message: `Cannot transition from ${currentStatus} to ${newStatus}`,
      });
    }

    // Validate who can make the transition
    if (newStatus === SessionStatus.UPCOMING) {
      // Only the requested peer can accept (PENDING -> UPCOMING)
      if (peerSession.requestedToId !== userId) {
        throw new ForbiddenException(
          'Only the requested peer can accept the session',
        );
      }
    } else if (newStatus === SessionStatus.DONE) {
      // Only the requested peer can mark as done (UPCOMING -> DONE)
      if (peerSession.requestedToId !== userId) {
        throw new ForbiddenException(
          'Only the requested peer can mark session as done',
        );
      }
    } else if (newStatus === SessionStatus.CANCELLED) {
      // Either party can cancel
      if (
        peerSession.requestedById !== userId &&
        peerSession.requestedToId !== userId
      ) {
        throw new ForbiddenException(
          'Only session participants can cancel the session',
        );
      }
    }
  }

  async checkIsHost(peerSessionId: string, userId: string) {
    // userId is actually clerkId, so we need to find the user by clerkId first
    const user = await this.prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!user) {
      throw new BadRequestException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    const peerSession = await this.prisma.peerSession.findUnique({
      where: { id: peerSessionId },
      select: { requestedToId: true },
    });

    if (!peerSession) {
      throw new NotFoundException('Peer session not found');
    }

    // For peer sessions, the host is the tutor (requestedToId)
    const isHost = peerSession.requestedToId === user.id;

    return { isHost };
  }

  async saveSessionFeedback(
    peerSessionId: string,
    userId: string,
    feedbackDto: SessionFeedbackDto,
  ) {
    // userId is actually clerkId, so we need to find the user by clerkId first
    const user = await this.prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, name: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const peerSession = await this.prisma.peerSession.findUnique({
      where: { id: peerSessionId },
      select: {
        id: true,
        requestedById: true,
        requestedToId: true,
      },
    });

    if (!peerSession) {
      throw new NotFoundException('Peer session not found');
    }

    // Check if user is either the requester or the requested tutor
    const isRequester = peerSession.requestedById === user.id;
    const isTutor = peerSession.requestedToId === user.id;

    if (!isRequester && !isTutor) {
      throw new ForbiddenException(
        'You are not authorized to submit feedback for this peer session',
      );
    }

    // Check if user has already submitted feedback for this session
    const existingFeedback = await this.prisma.sessionFeedback.findFirst({
      where: {
        userId: user.id,
        peerSessionId: peerSessionId,
      },
    });

    // Store all answers as JSON (cast to Prisma's InputJsonValue type)
    const answersJson = (feedbackDto.answers || {}) as unknown as Prisma.InputJsonValue;

    if (existingFeedback) {
      // Update existing feedback
      await this.prisma.sessionFeedback.update({
        where: { id: existingFeedback.id },
        data: {
          isHost: feedbackDto.isHost,
          answers: answersJson,
        },
      });

      this.logger.debug(
        '✅ [saveSessionFeedback] Feedback updated for peer session:',
        peerSessionId,
      );
    } else {
      // Create new feedback entry
      await this.prisma.sessionFeedback.create({
        data: {
          userId: user.id,
          peerSessionId: peerSessionId,
          isHost: feedbackDto.isHost,
          answers: answersJson,
        },
      });

      this.logger.debug(
        '✅ [saveSessionFeedback] Feedback created for peer session:',
        peerSessionId,
      );
    }

    return {
      success: true,
      message: 'Feedback submitted successfully',
      peerSessionId,
    };
  }

  async updatePeerSession(
    peerSessionId: string,
    clerkUserId: string,
    dto: UpdatePeerSessionDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const peerSession = await this.prisma.peerSession.findUnique({
      where: { id: peerSessionId },
      select: {
        id: true,
        requestedById: true,
        requestedToId: true,
        sessionStatus: true,
      },
    });

    if (!peerSession) {
      throw new NotFoundException('Peer session not found');
    }

    const isRequester = peerSession.requestedById === user.id;
    const isReceiver = peerSession.requestedToId === user.id;
    if (!isRequester && !isReceiver) {
      throw new ForbiddenException(
        'Only the two people in this session can update these details.',
      );
    }

    const closed: SessionStatus[] = [
      SessionStatus.DONE,
      SessionStatus.CANCELLED,
      SessionStatus.NOT_COMPLETED,
    ];
    if (closed.includes(peerSession.sessionStatus)) {
      throw new BadRequestException(
        'Cannot edit a session that is completed, cancelled, or marked not completed.',
      );
    }

    const hasScalar =
      dto.title !== undefined ||
      dto.description !== undefined ||
      dto.duration !== undefined ||
      dto.gmeetLink !== undefined ||
      dto.scheduledAt !== undefined;
    const hasSkills = dto.skills !== undefined;

    if (!hasScalar && !hasSkills) {
      throw new BadRequestException('No changes to apply');
    }

    const data: Prisma.PeerSessionUpdateInput = {};

    if (dto.title !== undefined) {
      const t = dto.title.trim();
      if (!t) {
        throw new BadRequestException('Title cannot be empty');
      }
      data.title = t;
    }

    if (dto.description !== undefined) {
      data.description = dto.description?.trim() || null;
    }

    if (dto.duration !== undefined) {
      data.duration = dto.duration;
    }

    if (dto.gmeetLink !== undefined) {
      const raw = dto.gmeetLink.trim();
      if (!raw) {
        data.gmeetLink = null;
      } else {
        const normalized = normalizeGoogleMeetLink(raw);
        if (!isValidGoogleMeetLink(normalized)) {
          throw new BadRequestException(
            'Invalid Google Meet link. Use a meet.google.com URL or meeting code.',
          );
        }
        data.gmeetLink = normalized;
      }
    }

    if (dto.scheduledAt !== undefined) {
      const next = new Date(dto.scheduledAt);
      if (Number.isNaN(next.getTime())) {
        throw new BadRequestException('Invalid scheduled time');
      }
      if (next.getTime() < Date.now()) {
        throw new BadRequestException({
          code: 'PAST_TIME_NOT_ALLOWED',
          message: 'Sessions cannot be scheduled in the past',
        });
      }
      data.date = next;
    }

    if (hasScalar) {
      await this.prisma.peerSession.update({
        where: { id: peerSessionId },
        data,
      });
    }

    if (hasSkills) {
      const skillNames =
        dto.skills!.length > 0 ? dto.skills! : ['Communication'];
      await this.prisma.peerSessionSkill.deleteMany({
        where: { peerSessionId },
      });
      for (const skillName of skillNames) {
        const skill = await this.prisma.skill.findUnique({
          where: { name: skillName },
        });
        if (skill) {
          await this.prisma.peerSessionSkill.create({
            data: { peerSessionId, skillId: skill.id },
          });
        }
      }
    }

    const detailsMarkedAt = new Date();
    await this.prisma.peerSession.update({
      where: { id: peerSessionId },
      data: {
        hostDetailsUpdatedAt: detailsMarkedAt,
        lastDetailsEditedById: user.id,
      },
    });

    const timeLabel = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'medium',
    }).format(detailsMarkedAt);

    const notifyUserId =
      peerSession.requestedToId === user.id
        ? peerSession.requestedById
        : peerSession.requestedToId;

    try {
      await this.notificationsService.createAndPushNotification(
        notifyUserId,
        `Meeting details have been changed (${timeLabel}).`,
        'Peer session',
        NotifType.NORMAL,
        {
          actionType: 'PEER_SESSION_DETAILS_UPDATED',
          peerSessionId,
          actionData: { sessionId: peerSessionId, sessionType: 'peerSession' },
        },
      );
    } catch (notifyErr) {
      this.logger.error(
        `Failed to notify user ${notifyUserId} of peer session details update (${peerSessionId})`,
        notifyErr instanceof Error ? notifyErr.message : String(notifyErr),
      );
    }

    await this.cacheService.deletePattern(
      `peer-sessions:list:*${peerSession.requestedById}*`,
    );
    await this.cacheService.deletePattern(
      `peer-sessions:list:*${peerSession.requestedToId}*`,
    );

    const dashboardUsers = await this.prisma.user.findMany({
      where: {
        id: { in: [peerSession.requestedById, peerSession.requestedToId] },
      },
      select: { clerkId: true },
    });
    for (const u of dashboardUsers) {
      await this.cacheService.deletePattern(
        `dashboard:data:*userId:${u.clerkId}*`,
      );
    }

    return this.getPeerSessionDetails(peerSessionId, clerkUserId);
  }
}
