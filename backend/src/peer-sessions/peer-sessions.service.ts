import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RequestSessionDto, UpdateSessionStatusDto } from './dto/peer-session.dto';
import { SessionStatus, PaymentStatus, NotifType } from '@prisma/client';
import { normalizeGoogleMeetLink, isValidGoogleMeetLink } from '../utils/gmeet-generator';
import { ChatService } from '../chat/chat.service';
import { convertLocalToUTC } from '../utils/timezone';

@Injectable()
export class PeerSessionsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private chatService: ChatService,
  ) {}

  async getPeerSessions(
    userId: string,
    status?: SessionStatus,
    requestedBy?: string,
    requestedTo?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    console.log('userId', userId);
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
        orderBy: { date: 'desc' },
      }),
      this.prisma.peerSession.count({ where }),
    ]);

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
  }

  async getPeerSessionDetails(peerSessionId: string, userId?: string) {
    const peerSession = await this.prisma.peerSession.findUnique({
      where: { id: peerSessionId },
      include: {
        requestedBy: { select: { id: true, name: true, avatar: true, clerkId: true } },
        requestedTo: { select: { id: true, name: true, avatar: true, clerkId: true } },
        skills: { include: { skill: { select: { id: true, name: true } } } },
      },
    });

    if (!peerSession) {
      throw new NotFoundException('Peer session not found');
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

    return {
      id: peerSession.id,
      title: peerSession.title,
      description: peerSession.description,
      sessionStatus: peerSession.sessionStatus,
      date: peerSession.date,
      duration: peerSession.duration,
      gmeetLink: peerSession.gmeetLink,
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
    };
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
        message: 'Not enough coins',
      });
    }

    // Convert user's local time to UTC
    // Example: 11 AM IST -> 5:30 AM UTC
    const dateTime = convertLocalToUTC(requestDto.date, requestDto.time, requestDto.timezone);

    // Normalize Google Meet link if provided
    const gmeetLink = requestDto.gmeetLink ? normalizeGoogleMeetLink(requestDto.gmeetLink) : null;

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
    const skillsToAdd = requestDto.skills && requestDto.skills.length > 0 ? requestDto.skills : ['Communication'];

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
      ...await this.getPeerSessionDetails(peerSession.id),
      payment: {
        id: payment.id,
        amount: payment.amountMade,
        status: payment.paymentStatus,
      },
    };
  }

  async updatePeerSessionStatus(peerSessionId: string, userId: string, updateDto: UpdateSessionStatusDto) {
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
    this.validateStatusTransition(peerSession.sessionStatus, updateDto.status, user.id, peerSession);

    await this.prisma.peerSession.update({
      where: { id: peerSessionId },
      data: { sessionStatus: updateDto.status },
    });

    // Handle payment based on status
    if (updateDto.status === SessionStatus.DONE && peerSession.payments.length > 0) {
      const payment = peerSession.payments[0];
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { paymentStatus: PaymentStatus.RECEIVED },
      });

      await this.prisma.user.update({
        where: { id: peerSession.requestedToId },
        data: { coins: { increment: payment.amountReceived || 0 } },
      });

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
    } else if (updateDto.status === SessionStatus.CANCELLED && peerSession.payments.length > 0) {
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
      const otherPartyId = user.id === peerSession.requestedById ? peerSession.requestedToId : peerSession.requestedById;
      const otherPartyName = user.id === peerSession.requestedById ? peerSession.requestedTo.name : peerSession.requestedBy.name;

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
      const channel = await this.chatService.getOrCreateDirectChannelForPeerSession(
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
    return this.updatePeerSessionStatus(peerSessionId, userId, { status: SessionStatus.UPCOMING });
  }

  // Convenience method to reject/cancel a peer session request
  async rejectPeerSession(peerSessionId: string, userId: string) {
    return this.updatePeerSessionStatus(peerSessionId, userId, { status: SessionStatus.CANCELLED });
  }

  // Convenience method to mark a session as done
  async completePeerSession(peerSessionId: string, userId: string) {
    return this.updatePeerSessionStatus(peerSessionId, userId, { status: SessionStatus.DONE });
  }

  private validateStatusTransition(
    currentStatus: SessionStatus,
    newStatus: SessionStatus,
    userId: string,
    peerSession: any
  ) {
    // Define valid status transitions
    const validTransitions = {
      [SessionStatus.PENDING]: [SessionStatus.UPCOMING, SessionStatus.CANCELLED],
      [SessionStatus.UPCOMING]: [SessionStatus.DONE, SessionStatus.CANCELLED],
      [SessionStatus.DONE]: [], // No transitions from DONE
      [SessionStatus.CANCELLED]: [], // No transitions from CANCELLED
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
        throw new ForbiddenException('Only the requested peer can accept the session');
      }
    } else if (newStatus === SessionStatus.DONE) {
      // Only the requested peer can mark as done (UPCOMING -> DONE)
      if (peerSession.requestedToId !== userId) {
        throw new ForbiddenException('Only the requested peer can mark session as done');
      }
    } else if (newStatus === SessionStatus.CANCELLED) {
      // Either party can cancel
      if (peerSession.requestedById !== userId && peerSession.requestedToId !== userId) {
        throw new ForbiddenException('Only session participants can cancel the session');
      }
    }
  }
}
