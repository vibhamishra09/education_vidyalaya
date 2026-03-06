import { Body, Controller, Headers, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotifType, SessionStatus } from '../generated/prisma/client';
import { LoggerService } from '../common/logger';

@Controller('api/livekit/webhooks')
export class LivekitWebhooksController {

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(LivekitWebhooksController.name);}

  @Post()
  async handleEvent(
    @Body() body: any,
    @Headers('authorization') _auth?: string,
  ) {
    // Handle participant_joined event for study rooms
    if (body.event === 'participant_joined') {
      const roomName = body.room?.name;
      const participantIdentity = body.participant?.identity; // This is the clerkId
      const participantName = body.participant?.name;

      // Check if this is a study room
      if (roomName?.startsWith('studyroom-')) {
        const suffix = roomName.replace('studyroom-', '');
        // UUID pattern = seriesId (recurring shared room), CUID = individual occurrence
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(suffix);
        let studyRoomId: string | undefined;
        if (isUuid) {
          // Find the ongoing occurrence for this series; fall back to next upcoming
          const occurrence = await this.prisma.studyRoom.findFirst({
            where: { seriesId: suffix, sessionStatus: SessionStatus.ONGOING },
            select: { id: true },
          }) ?? await this.prisma.studyRoom.findFirst({
            where: { seriesId: suffix, sessionStatus: SessionStatus.UPCOMING },
            orderBy: { date: 'asc' },
            select: { id: true },
          });
          studyRoomId = occurrence?.id;
        } else {
          studyRoomId = suffix;
        }
        if (studyRoomId) {
          await this.handleStudyRoomParticipantJoined(
            studyRoomId,
            participantIdentity,
            participantName,
          );
        }
      }
    }

    return { received: true };
  }

  private async handleStudyRoomParticipantJoined(
    studyRoomId: string,
    participantClerkId: string,
    participantName?: string,
  ) {
    try {
      // Find the user by clerkId
      const user = await this.prisma.user.findUnique({
        where: { clerkId: participantClerkId },
        select: { id: true, name: true },
      });

      if (!user) {
        this.logger.warn(
          `User not found for clerkId: ${participantClerkId} in study room ${studyRoomId}`,
        );
        return;
      }

      const displayName = participantName || user.name || 'Someone';

      // Find the study room with its creator and learners
      const studyRoom = await this.prisma.studyRoom.findUnique({
        where: { id: studyRoomId },
        include: {
          createdBy: { select: { id: true, name: true } },
          learners: {
            select: {
              user: { select: { id: true, name: true } },
            },
          },
        },
      });

      if (!studyRoom) {
        this.logger.warn(`Study room not found: ${studyRoomId}`);
        return;
      }

      // Check if the participant is the teacher (creator)
      const isTeacher = studyRoom.createdById === user.id;

      if (isTeacher) {
        // Teacher joined - notify all learners
        this.logger.log(
          `Teacher ${displayName} joined study room "${studyRoom.title}"`,
        );

        // Send notification to all learners
        for (const learner of studyRoom.learners) {
          await this.notificationsService.createAndPushNotification(
            learner.user.id,
            `${displayName} has joined the study room "${studyRoom.title}"`,
            'Teacher Joined',
            NotifType.NORMAL,
            {
              actionType: 'TEACHER_JOINED_STUDYROOM',
              studyRoomId: studyRoomId,
              actionData: { sessionId: studyRoomId, sessionType: 'studyRoom' },
            },
          );
        }

        this.logger.log(
          `Sent ${studyRoom.learners.length} notifications to learners`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error handling study room participant joined: ${error}`,
      );
    }
  }
}
