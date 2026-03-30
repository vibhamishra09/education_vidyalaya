import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { StudyRoomsService } from './study-rooms.service';
import { LoggerService } from '../common/logger/logger.service';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { OptionalClerkAuthGuard } from '../common/guards/optional-clerk-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  CreateStudyRoomDto,
  JoinWebinarWithPasscodeDto,
  PromoteParticipantRoleDto,
  RegisterWebinarDto,
  StudyRoomEditScope,
  UpdateStudyRoomDto,
  WebinarChatEnabledDto,
} from './dto/study-room.dto';
import { StudyRoomQueryDto } from './dto/study-room-query.dto';
import { SessionFeedbackDto } from '../common/dto/session-feedback.dto';

@Controller('api/study-rooms')
export class StudyRoomsController {
  constructor(
    private studyRoomsService: StudyRoomsService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(StudyRoomsController.name);
  }

  @Get()
  async getStudyRooms(@Query() query: StudyRoomQueryDto) {
    const startTime = Date.now();
    const isHomePageRequest = query.trending === true && query.limit === 6;

    this.logger.log({
      message: isHomePageRequest
        ? '🏠 [HomePage] Study rooms API called (trending-new)'
        : '📚 [StudyRooms] Study rooms API called',
      endpoint: '/api/study-rooms',
      query: {
        search: query.search,
        skills: query.skills,
        status: query.status,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        page: query.page || 1,
        limit: query.limit || 10,
        trending: query.trending,
      },
    });

    try {
      const result = await this.studyRoomsService.getStudyRooms(
        query.search,
        query.skills,
        query.status,
        query.dateFrom,
        query.dateTo,
        query.page || 1,
        query.limit || 10,
        query.trending,
        query.createdById,
      );

      const duration = Date.now() - startTime;
      this.logger.log({
        message: isHomePageRequest
          ? '✅ [HomePage] Study rooms API completed successfully'
          : '✅ [StudyRooms] Study rooms API completed successfully',
        endpoint: '/api/study-rooms',
        duration: `${duration}ms`,
        result: {
          studyRoomsCount: result.studyRooms?.length || 0,
          total: result.pagination?.total || 0,
          page: result.pagination?.page || 1,
          hasMore: result.pagination?.hasMore || false,
        },
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error({
        message: isHomePageRequest
          ? '❌ [HomePage] Study rooms API failed'
          : '❌ [StudyRooms] Study rooms API failed',
        endpoint: '/api/study-rooms',
        duration: `${duration}ms`,
        query: {
          search: query.search,
          skills: query.skills,
          status: query.status,
          trending: query.trending,
        },
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /** Public registration page metadata (no auth) */
  @Get('webinar/public/:slug')
  @UseGuards(OptionalClerkAuthGuard)
  async getWebinarPublic(@Param('slug') slug: string) {
    return this.studyRoomsService.getWebinarPublicBySlug(slug);
  }

  /** Webinar attendee registration (optional auth — bell notification when signed in) */
  @Post('webinar/register/:slug')
  @UseGuards(OptionalClerkAuthGuard)
  async registerWebinar(
    @Param('slug') slug: string,
    @Body() body: RegisterWebinarDto,
    @CurrentUser('dbUserId') dbUserId: string | undefined,
    @CurrentUser('clerkId') clerkId: string | undefined,
  ) {
    return this.studyRoomsService.registerForWebinar(slug, body, {
      dbUserId,
      clerkId,
    });
  }

  /** Join webinar with passcode + join link token (from registration email) */
  @Post('webinar/join')
  @UseGuards(OptionalClerkAuthGuard)
  async joinWebinarWithPasscode(@Body() body: JoinWebinarWithPasscodeDto) {
    return this.studyRoomsService.joinWebinarWithPasscode(body);
  }

  /** Poll for host approval (waiting room). Query: room=id, token=joinLinkToken from registration. */
  @Get('webinar/approval-status')
  @UseGuards(OptionalClerkAuthGuard)
  async getWebinarApprovalStatus(
    @Query('room') room: string,
    @Query('token') token: string,
  ) {
    return this.studyRoomsService.getWebinarRegistrationApprovalStatus(
      room,
      token,
    );
  }

  @Get('webinar/:studyRoomId/registrations')
  @UseGuards(ClerkAuthGuard)
  async listWebinarRegistrations(
    @Param('studyRoomId') studyRoomId: string,
    @CurrentUser('dbUserId') dbUserId: string | undefined,
    @CurrentUser('clerkId') clerkUserId: string,
  ) {
    const actorKey = dbUserId ?? clerkUserId;
    if (!actorKey) {
      throw new UnauthorizedException('User identity missing');
    }
    return this.studyRoomsService.listWebinarRegistrations(
      studyRoomId,
      actorKey,
    );
  }

  @Post('webinar/:studyRoomId/registrations/:registrationId/approve')
  @UseGuards(ClerkAuthGuard)
  async approveWebinarRegistration(
    @Param('studyRoomId') studyRoomId: string,
    @Param('registrationId') registrationId: string,
    @CurrentUser('dbUserId') dbUserId: string | undefined,
    @CurrentUser('clerkId') clerkUserId: string,
  ) {
    const actorKey = dbUserId ?? clerkUserId;
    if (!actorKey) {
      throw new UnauthorizedException('User identity missing');
    }
    return this.studyRoomsService.approveWebinarRegistration(
      studyRoomId,
      registrationId,
      actorKey,
    );
  }

  @Delete('webinar/:studyRoomId/guests/:guestId')
  @UseGuards(ClerkAuthGuard)
  async removeWebinarGuest(
    @Param('studyRoomId') studyRoomId: string,
    @Param('guestId') guestId: string,
    @CurrentUser('dbUserId') dbUserId: string | undefined,
    @CurrentUser('clerkId') clerkUserId: string,
  ) {
    const actorKey = dbUserId ?? clerkUserId;
    if (!actorKey) {
      throw new UnauthorizedException('User identity missing');
    }
    return this.studyRoomsService.removeWebinarGuest(
      studyRoomId,
      guestId,
      actorKey,
    );
  }

  @Patch('webinar/:studyRoomId/chat-enabled')
  @UseGuards(ClerkAuthGuard)
  async setWebinarChatEnabled(
    @Param('studyRoomId') studyRoomId: string,
    @Body() body: WebinarChatEnabledDto,
    @CurrentUser('clerkId') clerkId: string,
  ) {
    return this.studyRoomsService.setWebinarChatEnabled(
      studyRoomId,
      clerkId,
      body.enabled,
    );
  }

  @Get(':studyRoomId')
  @UseGuards(OptionalClerkAuthGuard)
  async getStudyRoomDetails(
    @Param('studyRoomId') studyRoomId: string,
    @CurrentUser('dbUserId') userId?: string,
    @CurrentUser('clerkId') clerkUserId?: string,
  ) {
    return this.studyRoomsService.getStudyRoomDetails(
      studyRoomId,
      userId ?? clerkUserId,
    );
  }

  @Post()
  @UseGuards(ClerkAuthGuard)
  async createStudyRoom(
    @CurrentUser('dbUserId') userId: string | undefined,
    @CurrentUser('clerkId') clerkUserId: string,
    @Body() createDto: CreateStudyRoomDto,
  ) {
    this.logger.debug({
      message: 'Creating study room',
      createDto,
    });
    return this.studyRoomsService.createStudyRoom(
      userId ?? clerkUserId,
      createDto,
    );
  }

  @Post('/recurring')
  @UseGuards(ClerkAuthGuard)
  async createRecurringStudyRoom(
    @CurrentUser('dbUserId') userId: string | undefined,
    @CurrentUser('clerkId') clerkUserId: string,
    @Body() createDto: CreateStudyRoomDto,
  ) {
    this.logger.debug({
      message: 'Creating study room',
      createDto,
    });
    return this.studyRoomsService.createRecurringRoom(
      userId ?? clerkUserId,
      createDto,
    );
  }

  @Patch(':studyRoomId')
  @UseGuards(ClerkAuthGuard)
  async updateStudyRoom(
    @Param('studyRoomId') studyRoomId: string,
    @CurrentUser('dbUserId') dbUserId: string | undefined,
    @CurrentUser('clerkId') clerkUserId: string,
    @Body() updateDto: UpdateStudyRoomDto,
  ) {
    // Match createStudyRoom: JWT may omit metadata.dbUserId; resolve user by Clerk id in service.
    const actorKey = dbUserId ?? clerkUserId;
    if (!actorKey) {
      throw new UnauthorizedException('User identity missing');
    }
    return this.studyRoomsService.updateStudyRoom(
      studyRoomId,
      actorKey,
      updateDto,
    );
  }

  @Post(':studyRoomId/join')
  @UseGuards(ClerkAuthGuard)
  async joinStudyRoom(
    @Param('studyRoomId') studyRoomId: string,
    @CurrentUser('dbUserId') dbUserId: string | undefined,
    @CurrentUser('clerkId') clerkUserId: string,
  ) {
    const actorKey = dbUserId ?? clerkUserId;
    if (!actorKey) {
      throw new UnauthorizedException('User identity missing');
    }
    return this.studyRoomsService.joinStudyRoom(studyRoomId, actorKey);
  }

  @Post(':id/join-recurring')
  @UseGuards(ClerkAuthGuard)
  async joinRecurring(
    @Param('id') id: string,
    @Body() dto: { scope: 'THIS' | 'FOLLOWING' },
    @CurrentUser('dbUserId') dbUserId: string,
    @CurrentUser('clerkId') clerkUserId?: string,
  ) {
    const actorKey = dbUserId ?? clerkUserId;
    if (!actorKey) {
      throw new UnauthorizedException('User identity missing');
    }

    return this.studyRoomsService.joinRecurringStudyRoom(id, actorKey, dto);
  }

  @Post(':id/unenroll')
  @UseGuards(ClerkAuthGuard)
  async unenroll(
    @Param('id') roomId: string,
    @CurrentUser('clerkId') clerkUserId: string,
    @CurrentUser('dbUserId') dbUserId: string,
    @Body() dto: { scope: 'ALL' | 'THIS' | 'FOLLOWING' }
  ) {
    const actorKey = dbUserId ?? clerkUserId;
    if (!actorKey) {
      throw new UnauthorizedException('User identity missing');
    }
    
    return this.studyRoomsService.unenroll(actorKey, roomId, dto.scope);
  }

  @Post(':studyRoomId/participants/role')
  @UseGuards(ClerkAuthGuard)
  async updateParticipantRole(
    @Param('studyRoomId') studyRoomId: string,
    @CurrentUser('clerkId') clerkUserId: string,
    @CurrentUser('dbUserId') dbUserId: string,
    @Body() dto: PromoteParticipantRoleDto,
  ) {
     const actorKey = dbUserId ?? clerkUserId;
    if (!actorKey) {
      throw new UnauthorizedException('User identity missing');
    }
    
    return this.studyRoomsService.updateParticipantRole(
      studyRoomId,
      actorKey,
      dto.participantIdentity,
      dto.role,
    );
  }

  @Post(':studyRoomId/cancel')
  @UseGuards(ClerkAuthGuard)
  async cancelStudyRoom(
    @Param('studyRoomId') studyRoomId: string,
    @CurrentUser('clerkId') clerkUserId: string,
    @CurrentUser('dbUserId') userId: string,
    @Body('editScope') editScope?: StudyRoomEditScope,
  ) {
    const actorKey = userId ?? clerkUserId;
    if (!actorKey) {
      throw new UnauthorizedException('User identity missing');
    }
    
    return this.studyRoomsService.cancelStudyRoom(
      studyRoomId,
      actorKey,
      editScope ?? StudyRoomEditScope.SINGLE,
    );
  }

  @Post(':studyRoomId/complete')
  @UseGuards(ClerkAuthGuard)
  async completeStudyRoom(
    @Param('studyRoomId') studyRoomId: string,
    @CurrentUser('clerkId') clerkUserId: string,
    @CurrentUser('dbUserId') userId: string,
  ) {
    const actorKey = userId ?? clerkUserId;
    if (!actorKey) {
      throw new UnauthorizedException('User identity missing');
    }
    this.logger.debug({
      message: '🎯 [StudyRoomsController.completeStudyRoom] Endpoint called',
      studyRoomId,
      userId,
    });
    const result = await this.studyRoomsService.completeStudyRoom(
      studyRoomId,
      actorKey,
    );
    this.logger.log(
      '✅ [StudyRoomsController.completeStudyRoom] Completed successfully',
    );
    return result;
  }

  @Post(':studyRoomId/not-completed')
  @UseGuards(ClerkAuthGuard)
  async markNotCompleted(
    @Param('studyRoomId') studyRoomId: string,
    @CurrentUser('clerkId') clerkUserId: string,
    @CurrentUser('dbUserId') userId: string,
  ) {
    const actorKey = userId ?? clerkUserId;
    if (!actorKey) {
      throw new UnauthorizedException('User identity missing');
    }
    this.logger.debug({
      message: '⏱️ [StudyRoomsController.markNotCompleted] Endpoint called',
      studyRoomId,
      actorKey,
    });
    return this.studyRoomsService.markNotCompleted(studyRoomId, userId);
  }

  @Get(':studyRoomId/is-host')
  @UseGuards(ClerkAuthGuard)
  async checkIsHost(
    @Param('studyRoomId') studyRoomId: string,
    @CurrentUser('dbUserId') dbUserId: string | undefined,
    /** Prefer decorator over raw req — matches attachAuthenticatedUser + Clerk session */
    @CurrentUser('clerkId') clerkUserId: string | undefined,
  ) {
    return this.studyRoomsService.checkIsHost(
      studyRoomId,
      dbUserId,
      clerkUserId,
    );
  }

  @Post(':studyRoomId/feedback')
  @UseGuards(ClerkAuthGuard)
  async submitSessionFeedback(
    @Param('studyRoomId') studyRoomId: string,
    @CurrentUser('clerkId') clerkUserId: string,
    @CurrentUser('dbUserId') userId: string,
    @Body() feedbackDto: SessionFeedbackDto,
  ) {
    const actorKey = userId ?? clerkUserId;
    if (!actorKey) {
      throw new UnauthorizedException('User identity missing');
    }
    this.logger.debug({
      message:
        '📝 [StudyRoomsController.submitSessionFeedback] Endpoint called',
      studyRoomId,
      userId,
      isHost: feedbackDto.isHost,
    });
    return this.studyRoomsService.saveSessionFeedback(
      studyRoomId,
      actorKey,
      feedbackDto,
    );
  }
}
