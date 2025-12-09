import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { TranscriptsService } from '../transcripts/transcripts.service';
import { StreaksService } from '../streaks/streaks.service';
import { SessionStatus, NotifType } from '@prisma/client';

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private transcriptsService: TranscriptsService,
    private streaksService: StreaksService,
  ) {}

  // Run every 5 minutes to check for session reminders
  @Cron('*/5 * * * *')
  async handleSessionReminders() {
    this.logger.log('Checking for session reminders...');

    const now = new Date();
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    // Find upcoming peer sessions
    await this.sendPeerSessionReminders(
      now,
      oneDayFromNow,
      oneHourFromNow,
      fiveMinutesFromNow,
    );

    // Find upcoming study rooms
    await this.sendStudyRoomReminders(
      now,
      oneDayFromNow,
      oneHourFromNow,
      fiveMinutesFromNow,
    );
  }

  // Run every 5 minutes to check for sessions that have ended
  @Cron('*/5 * * * *')
  async handleSessionEndNotifications() {
    this.logger.log('Checking for ended sessions...');

    const now = new Date();

    // Check for ended peer sessions
    await this.sendPeerSessionEndNotifications(now);

    // Check for ended study rooms
    await this.sendStudyRoomEndNotifications(now);
  }

  private async sendPeerSessionReminders(
    now: Date,
    oneDayFromNow: Date,
    oneHourFromNow: Date,
    fiveMinutesFromNow: Date,
  ) {
    // Find sessions starting within 24 hours that haven't been reminded yet
    const upcomingSessions24h = await this.prisma.peerSession.findMany({
      where: {
        sessionStatus: SessionStatus.UPCOMING,
        date: {
          gte: now,
          lte: oneDayFromNow,
        },
        reminder24hSent: false,
      },
      include: {
        requestedBy: true,
        requestedTo: true,
      },
    });

    // Find sessions starting within 1 hour that haven't been reminded yet
    const upcomingSessions1h = await this.prisma.peerSession.findMany({
      where: {
        sessionStatus: SessionStatus.UPCOMING,
        date: {
          gte: now,
          lte: oneHourFromNow,
        },
        reminder1hSent: false,
      },
      include: {
        requestedBy: true,
        requestedTo: true,
      },
    });

    // Find sessions starting within 5 minutes that haven't been reminded yet
    const upcomingSessions5m = await this.prisma.peerSession.findMany({
      where: {
        sessionStatus: SessionStatus.UPCOMING,
        date: {
          gte: now,
          lte: fiveMinutesFromNow,
        },
        reminder5mSent: false,
      },
      include: {
        requestedBy: true,
        requestedTo: true,
      },
    });

    // Send 24-hour reminders
    for (const session of upcomingSessions24h) {
      const locked = await this.prisma.peerSession.updateMany({
        where: { id: session.id, reminder24hSent: false },
        data: { reminder24hSent: true },
      });

      if (!locked.count) {
        continue;
      }

      const message24h = `Reminder: Your peer session "${session.title}" starts in 24 hours`;

      await this.notificationsService.createAndPushNotification(
        session.requestedById,
        message24h,
        'Session Reminder',
        NotifType.NORMAL,
        {
          actionType: 'SESSION_REMINDER_24H',
          peerSessionId: session.id,
          actionData: { sessionId: session.id, sessionType: 'peerSession' },
        },
      );

      await this.notificationsService.createAndPushNotification(
        session.requestedToId,
        message24h,
        'Session Reminder',
        NotifType.NORMAL,
        {
          actionType: 'SESSION_REMINDER_24H',
          peerSessionId: session.id,
          actionData: { sessionId: session.id, sessionType: 'peerSession' },
        },
      );
    }

    // Send 1-hour reminders (URGENT)
    for (const session of upcomingSessions1h) {
      const locked = await this.prisma.peerSession.updateMany({
        where: { id: session.id, reminder1hSent: false },
        data: { reminder1hSent: true },
      });

      if (!locked.count) {
        continue;
      }

      const message1h = `Your peer session "${session.title}" starts in 1 hour!`;

      await this.notificationsService.createAndPushNotification(
        session.requestedById,
        message1h,
        'Session Starting Soon!',
        NotifType.URGENT,
        {
          actionType: 'SESSION_REMINDER_1H',
          peerSessionId: session.id,
          actionData: { sessionId: session.id, sessionType: 'peerSession' },
        },
      );

      await this.notificationsService.createAndPushNotification(
        session.requestedToId,
        message1h,
        'Session Starting Soon!',
        NotifType.URGENT,
        {
          actionType: 'SESSION_REMINDER_1H',
          peerSessionId: session.id,
          actionData: { sessionId: session.id, sessionType: 'peerSession' },
        },
      );
    }

    // Send 5-minute reminders (URGENT)
    for (const session of upcomingSessions5m) {
      const locked = await this.prisma.peerSession.updateMany({
        where: { id: session.id, reminder5mSent: false },
        data: { reminder5mSent: true },
      });

      if (!locked.count) {
        continue;
      }

      const message5m = `Your peer session "${session.title}" starts in 5 minutes!`;

      await this.notificationsService.createAndPushNotification(
        session.requestedById,
        message5m,
        'Session Starting Now!',
        NotifType.URGENT,
        {
          actionType: 'SESSION_REMINDER_5M',
          peerSessionId: session.id,
          actionData: { sessionId: session.id, sessionType: 'peerSession' },
        },
      );

      await this.notificationsService.createAndPushNotification(
        session.requestedToId,
        message5m,
        'Session Starting Now!',
        NotifType.URGENT,
        {
          actionType: 'SESSION_REMINDER_5M',
          peerSessionId: session.id,
          actionData: { sessionId: session.id, sessionType: 'peerSession' },
        },
      );
    }

    this.logger.log(
      `Sent ${upcomingSessions24h.length * 2} 24-hour, ${upcomingSessions1h.length * 2} 1-hour, and ${upcomingSessions5m.length * 2} 5-minute peer session reminders`,
    );
  }

  private async sendStudyRoomReminders(
    now: Date,
    oneDayFromNow: Date,
    oneHourFromNow: Date,
    fiveMinutesFromNow: Date,
  ) {
    // Find study rooms starting within 24 hours that haven't been reminded yet
    const upcomingRooms24h = await this.prisma.studyRoom.findMany({
      where: {
        sessionStatus: SessionStatus.UPCOMING,
        date: {
          gte: now,
          lte: oneDayFromNow,
        },
        reminder24hSent: false,
      },
      include: {
        createdBy: true,
        learners: {
          include: {
            user: true,
          },
        },
      },
    });

    // Find study rooms starting within 1 hour that haven't been reminded yet
    const upcomingRooms1h = await this.prisma.studyRoom.findMany({
      where: {
        sessionStatus: SessionStatus.UPCOMING,
        date: {
          gte: now,
          lte: oneHourFromNow,
        },
        reminder1hSent: false,
      },
      include: {
        createdBy: true,
        learners: {
          include: {
            user: true,
          },
        },
      },
    });

    // Find study rooms starting within 5 minutes that haven't been reminded yet
    const upcomingRooms5m = await this.prisma.studyRoom.findMany({
      where: {
        sessionStatus: SessionStatus.UPCOMING,
        date: {
          gte: now,
          lte: fiveMinutesFromNow,
        },
        reminder5mSent: false,
      },
      include: {
        createdBy: true,
        learners: {
          include: {
            user: true,
          },
        },
      },
    });

    // Send 24-hour reminders
    for (const room of upcomingRooms24h) {
      const locked = await this.prisma.studyRoom.updateMany({
        where: { id: room.id, reminder24hSent: false },
        data: { reminder24hSent: true },
      });

      if (!locked.count) {
        continue;
      }

      const message24h = `Reminder: Study room "${room.title}" starts in 24 hours`;

      // Notify creator
      await this.notificationsService.createAndPushNotification(
        room.createdById,
        message24h,
        'Study Room Reminder',
        NotifType.NORMAL,
        {
          actionType: 'STUDYROOM_REMINDER_24H',
          studyRoomId: room.id,
          actionData: { sessionId: room.id, sessionType: 'studyRoom' },
        },
      );

      // Notify all participants
      for (const learner of room.learners) {
        await this.notificationsService.createAndPushNotification(
          learner.userId,
          message24h,
          'Study Room Reminder',
          NotifType.NORMAL,
          {
            actionType: 'STUDYROOM_REMINDER_24H',
            studyRoomId: room.id,
            actionData: { sessionId: room.id, sessionType: 'studyRoom' },
          },
        );
      }
    }

    // Send 1-hour reminders (URGENT)
    for (const room of upcomingRooms1h) {
      const locked = await this.prisma.studyRoom.updateMany({
        where: { id: room.id, reminder1hSent: false },
        data: { reminder1hSent: true },
      });

      if (!locked.count) {
        continue;
      }

      const message1h = `Study room "${room.title}" starts in 1 hour!`;

      // Notify creator
      await this.notificationsService.createAndPushNotification(
        room.createdById,
        message1h,
        'Study Room Starting Soon!',
        NotifType.URGENT,
        {
          actionType: 'STUDYROOM_REMINDER_1H',
          studyRoomId: room.id,
          actionData: { sessionId: room.id, sessionType: 'studyRoom' },
        },
      );

      // Notify all participants
      for (const learner of room.learners) {
        await this.notificationsService.createAndPushNotification(
          learner.userId,
          message1h,
          'Study Room Starting Soon!',
          NotifType.URGENT,
          {
            actionType: 'STUDYROOM_REMINDER_1H',
            studyRoomId: room.id,
            actionData: { sessionId: room.id, sessionType: 'studyRoom' },
          },
        );
      }
    }

    // Send 5-minute reminders (URGENT)
    for (const room of upcomingRooms5m) {
      const locked = await this.prisma.studyRoom.updateMany({
        where: { id: room.id, reminder5mSent: false },
        data: { reminder5mSent: true },
      });

      if (!locked.count) {
        continue;
      }

      const message5m = `Study room "${room.title}" starts in 5 minutes!`;

      // Notify creator
      await this.notificationsService.createAndPushNotification(
        room.createdById,
        message5m,
        'Study Room Starting Now!',
        NotifType.URGENT,
        {
          actionType: 'STUDYROOM_REMINDER_5M',
          studyRoomId: room.id,
          actionData: { sessionId: room.id, sessionType: 'studyRoom' },
        },
      );

      // Notify all participants
      for (const learner of room.learners) {
        await this.notificationsService.createAndPushNotification(
          learner.userId,
          message5m,
          'Study Room Starting Now!',
          NotifType.URGENT,
          {
            actionType: 'STUDYROOM_REMINDER_5M',
            studyRoomId: room.id,
            actionData: { sessionId: room.id, sessionType: 'studyRoom' },
          },
        );
      }
    }

    this.logger.log(
      `Sent study room reminders for ${upcomingRooms24h.length} 24-hour, ${upcomingRooms1h.length} 1-hour, and ${upcomingRooms5m.length} 5-minute sessions`,
    );
  }

  // Run every 6 hours to check for completed sessions without reviews
  @Cron('0 */6 * * *')
  async handleReviewReminders() {
    this.logger.log('Checking for review reminders...');

    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    // Find completed peer sessions without reviews
    const completedPeerSessions = await this.prisma.peerSession.findMany({
      where: {
        sessionStatus: SessionStatus.DONE,
        reviewReminded: false,
        date: {
          gte: threeDaysAgo, // Only remind for sessions within last 3 days
        },
      },
      include: {
        reviews: true,
        requestedBy: true,
        requestedTo: true,
      },
    });

    for (const session of completedPeerSessions) {
      const locked = await this.prisma.peerSession.updateMany({
        where: { id: session.id, reviewReminded: false },
        data: { reviewReminded: true },
      });

      if (!locked.count) {
        continue;
      }

      // Check if requester has reviewed
      const requesterReviewed = session.reviews.some(
        (r) => r.reviewerId === session.requestedById,
      );
      if (!requesterReviewed) {
        await this.notificationsService.createAndPushNotification(
          session.requestedById,
          `Please review your session with ${session.requestedTo.name}`,
          'Review Reminder',
          NotifType.URGENT,
          {
            actionType: 'REVIEW_REMINDER',
            peerSessionId: session.id,
            actionData: { sessionId: session.id, sessionType: 'peerSession' },
          },
        );
      }

      // Check if peer has reviewed
      const peerReviewed = session.reviews.some(
        (r) => r.reviewerId === session.requestedToId,
      );
      if (!peerReviewed) {
        await this.notificationsService.createAndPushNotification(
          session.requestedToId,
          `Please review your session with ${session.requestedBy.name}`,
          'Review Reminder',
          NotifType.URGENT,
          {
            actionType: 'REVIEW_REMINDER',
            peerSessionId: session.id,
            actionData: { sessionId: session.id, sessionType: 'peerSession' },
          },
        );
      }
    }

    // Find completed study rooms without reviews
    const completedStudyRooms = await this.prisma.studyRoom.findMany({
      where: {
        sessionStatus: SessionStatus.DONE,
        reviewReminded: false,
        date: {
          gte: threeDaysAgo,
        },
      },
      include: {
        reviews: true,
        learners: {
          include: {
            user: true,
          },
        },
        createdBy: true,
      },
    });

    for (const room of completedStudyRooms) {
      const locked = await this.prisma.studyRoom.updateMany({
        where: { id: room.id, reviewReminded: false },
        data: { reviewReminded: true },
      });

      if (!locked.count) {
        continue;
      }

      // Remind all participants who haven't reviewed
      for (const learner of room.learners) {
        const hasReviewed = room.reviews.some(
          (r) => r.reviewerId === learner.userId,
        );
        if (!hasReviewed) {
          await this.notificationsService.createAndPushNotification(
            learner.userId,
            `Please review the study room "${room.title}" with ${room.createdBy.name}`,
            'Review Reminder',
            NotifType.URGENT,
            {
              actionType: 'REVIEW_REMINDER',
              studyRoomId: room.id,
              actionData: { sessionId: room.id, sessionType: 'studyRoom' },
            },
          );
        }
      }
    }

    this.logger.log(
      `Sent review reminders for ${completedPeerSessions.length} peer sessions and ${completedStudyRooms.length} study rooms`,
    );
  }

  private async sendPeerSessionEndNotifications(now: Date) {
    // Find peer sessions that should have ended (start time + duration < now) 
    // but are still UPCOMING or ONGOING
    const endedSessions = await this.prisma.peerSession.findMany({
      where: {
        sessionStatus: {
          in: [SessionStatus.UPCOMING, SessionStatus.ONGOING],
        },
        // Calculate end time: date + duration (in minutes)
        // We use raw SQL to calculate the end time
        // This finds sessions where (date + interval '1 minute' * duration) < now
      },
      include: {
        requestedBy: true,
        requestedTo: true,
        payments: true,
      },
    });

    // Filter sessions that have actually ended
    const actuallyEndedSessions = endedSessions.filter((session) => {
      const endTime = new Date(
        session.date.getTime() + session.duration * 60 * 1000,
      );
      return endTime < now;
    });

    for (const session of actuallyEndedSessions) {
      // Update sessions that are either UPCOMING or ONGOING to DONE
      const locked = await this.prisma.peerSession.updateMany({
        where: { 
          id: session.id, 
          sessionStatus: {
            in: [SessionStatus.UPCOMING, SessionStatus.ONGOING],
          },
        },
        data: { sessionStatus: SessionStatus.DONE },
      });

      if (!locked.count) {
        continue;
      }

      // Generate AI summary from transcripts (if not already generated)
      // This ensures summaries are created even if no one stayed till the end
      if (!session.summary) {
        try {
          this.logger.log(
            `[Scheduler] Generating AI summary for peer session: ${session.id}`,
          );
          const summary = await this.transcriptsService.compileAndSummarize(
            session.id,
          );

          // Store summary in database
          await this.prisma.peerSession.update({
            where: { id: session.id },
            data: { summary },
          });
          this.logger.log(
            `[Scheduler] AI summary generated and stored for peer session: ${session.id}`,
          );
        } catch (error) {
          this.logger.error(
            `[Scheduler] Failed to generate summary for peer session ${session.id}:`,
            error,
          );
          // Continue execution even if summary generation fails
        }
      }

      // Update streaks for both participants
      try {
        this.logger.log(
          `[Scheduler] Updating streaks for peer session: ${session.id}`,
        );

        // Update streak for teacher (requestedTo)
        await this.streaksService.updateUserActivity(
          session.requestedToId,
          session.date,
          session.duration,
          'teacher',
          0,
        );

        // Calculate total amount paid from payments
        const totalAmountPaid = session.payments.reduce(
          (sum, payment) => sum + Number(payment.amountMade || 0),
          0,
        );

        // Update streak for learner (requestedBy)
        await this.streaksService.updateUserActivity(
          session.requestedById,
          session.date,
          session.duration,
          'learner',
          totalAmountPaid,
        );

        this.logger.log(
          `[Scheduler] Streaks updated for peer session: ${session.id}`,
        );
      } catch (error) {
        this.logger.error(
          `[Scheduler] Failed to update streaks for peer session ${session.id}:`,
          error,
        );
        // Continue execution even if streak update fails
      }

      // Note: Escrow payment will be released after both parties submit reviews
      // This is handled in the reviews service

      // Send session end notifications to both parties
      await this.notificationsService.createAndPushNotification(
        session.requestedById,
        `Your session with ${session.requestedTo.name} has ended. Please leave a review!`,
        'Session Ended - Leave Review',
        NotifType.URGENT,
        {
          actionType: 'SESSION_ENDED_REVIEW',
          peerSessionId: session.id,
          actionData: { sessionId: session.id, sessionType: 'peerSession' },
        },
      );

      await this.notificationsService.createAndPushNotification(
        session.requestedToId,
        `Your session with ${session.requestedBy.name} has ended. Please leave a review!`,
        'Session Ended - Leave Review',
        NotifType.URGENT,
        {
          actionType: 'SESSION_ENDED_REVIEW',
          peerSessionId: session.id,
          actionData: { sessionId: session.id, sessionType: 'peerSession' },
        },
      );
    }

    this.logger.log(
      `Processed ${actuallyEndedSessions.length} ended peer sessions`,
    );
  }

  private async sendStudyRoomEndNotifications(now: Date) {
    // Find study rooms that should have ended (start time + duration < now) 
    // but are still UPCOMING or ONGOING
    const endedRooms = await this.prisma.studyRoom.findMany({
      where: {
        sessionStatus: {
          in: [SessionStatus.UPCOMING, SessionStatus.ONGOING],
        },
      },
      include: {
        createdBy: true,
        learners: {
          include: {
            user: true,
          },
        },
        payments: true,
      },
    });

    // Filter rooms that have actually ended
    const actuallyEndedRooms = endedRooms.filter((room) => {
      const endTime = new Date(room.date.getTime() + room.duration * 60 * 1000);
      return endTime < now;
    });

    for (const room of actuallyEndedRooms) {
      // Update rooms that are either UPCOMING or ONGOING to DONE
      const locked = await this.prisma.studyRoom.updateMany({
        where: { 
          id: room.id, 
          sessionStatus: {
            in: [SessionStatus.UPCOMING, SessionStatus.ONGOING],
          },
        },
        data: { sessionStatus: SessionStatus.DONE },
      });

      if (!locked.count) {
        continue;
      }

      // Generate AI summary from transcripts (if not already generated)
      // This ensures summaries are created even if no one stayed till the end
      if (!room.summary) {
        try {
          this.logger.log(
            `[Scheduler] Generating AI summary for study room: ${room.id}`,
          );
          const summary = await this.transcriptsService.compileAndSummarize(
            room.id,
          );

          // Store summary in database
          await this.prisma.studyRoom.update({
            where: { id: room.id },
            data: { summary },
          });
          this.logger.log(
            `[Scheduler] AI summary generated and stored for study room: ${room.id}`,
          );
        } catch (error) {
          this.logger.error(
            `[Scheduler] Failed to generate summary for study room ${room.id}:`,
            error,
          );
          // Continue execution even if summary generation fails
        }
      }

      // Update streaks for all participants
      try {
        this.logger.log(
          `🔥 [Scheduler] Updating streaks for study room: ${room.id}`,
        );

        // Update streak for creator (host/teacher)
        await this.streaksService.updateUserActivity(
          room.createdById,
          room.date,
          room.duration,
          'teacher',
          0,
        );

        // Update streak for all learners
        for (const learner of room.learners) {
          // Find the payment made by this learner
          const learnerPayment = room.payments.find(
            (p) => p.madeById === learner.userId,
          );
          const amountPaid = learnerPayment
            ? Number(learnerPayment.amountMade || 0)
            : 0;

          await this.streaksService.updateUserActivity(
            learner.userId,
            room.date,
            room.duration,
            'learner',
            amountPaid,
          );
        }

        this.logger.log(
          `[Scheduler] Streaks updated for study room: ${room.id}`,
        );
      } catch (error) {
        this.logger.error(
          `[Scheduler] Failed to update streaks for study room ${room.id}:`,
          error,
        );
        // Continue execution even if streak update fails
      }

      // Note: Escrow payments will be released after all participants submit reviews
      // This is handled in the reviews service

      // Send session end notifications to all learners (creator should not review)
      const learnerUsers = room.learners.map((learner) => learner.user);

      for (const participant of learnerUsers) {
        await this.notificationsService.createAndPushNotification(
          participant.id,
          `Study room "${room.title}" has ended. Please leave a review!`,
          'Study Room Ended - Leave Review',
          NotifType.URGENT,
          {
            actionType: 'STUDYROOM_ENDED_REVIEW',
            studyRoomId: room.id,
            actionData: { sessionId: room.id, sessionType: 'studyRoom' },
          },
        );
      }
    }

    this.logger.log(`Processed ${actuallyEndedRooms.length} ended study rooms`);
  }
}
