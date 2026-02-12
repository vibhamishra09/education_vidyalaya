import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { StudyRoomsService } from './study-rooms.service';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { OptionalClerkAuthGuard } from '../common/guards/optional-clerk-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateStudyRoomDto, UpdateStudyRoomDto } from './dto/study-room.dto';
import { StudyRoomQueryDto } from './dto/study-room-query.dto';
import { SessionFeedbackDto } from '../common/dto/session-feedback.dto';

@Controller('api/study-rooms')
export class StudyRoomsController {
  private readonly logger = new Logger(StudyRoomsController.name);

  constructor(private studyRoomsService: StudyRoomsService) {}

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

  @Get(':studyRoomId')
  @UseGuards(OptionalClerkAuthGuard)
  async getStudyRoomDetails(
    @Param('studyRoomId') studyRoomId: string,
    @CurrentUser() userId?: string,
  ) {
    return this.studyRoomsService.getStudyRoomDetails(studyRoomId, userId);
  }

  @Post()
  @UseGuards(ClerkAuthGuard)
  async createStudyRoom(
    @CurrentUser() userId: string,
    @Body() createDto: CreateStudyRoomDto,
  ) {
    console.log('createDto', createDto);
    return this.studyRoomsService.createStudyRoom(userId, createDto);
  }

  @Patch(':studyRoomId')
  @UseGuards(ClerkAuthGuard)
  async updateStudyRoom(
    @Param('studyRoomId') studyRoomId: string,
    @CurrentUser() userId: string,
    @Body() updateDto: UpdateStudyRoomDto,
  ) {
    return this.studyRoomsService.updateStudyRoom(
      studyRoomId,
      userId,
      updateDto,
    );
  }

  @Post(':studyRoomId/join')
  @UseGuards(ClerkAuthGuard)
  async joinStudyRoom(
    @Param('studyRoomId') studyRoomId: string,
    @CurrentUser() userId: string,
  ) {
    return this.studyRoomsService.joinStudyRoom(studyRoomId, userId);
  }

  @Post(':studyRoomId/complete')
  @UseGuards(ClerkAuthGuard)
  async completeStudyRoom(
    @Param('studyRoomId') studyRoomId: string,
    @CurrentUser() userId: string,
  ) {
    console.log(
      '🎯 [StudyRoomsController.completeStudyRoom] Endpoint called:',
      { studyRoomId, userId },
    );
    const result = await this.studyRoomsService.completeStudyRoom(
      studyRoomId,
      userId,
    );
    console.log(
      '✅ [StudyRoomsController.completeStudyRoom] Completed successfully',
    );
    return result;
  }

  @Post(':studyRoomId/not-completed')
  @UseGuards(ClerkAuthGuard)
  async markNotCompleted(
    @Param('studyRoomId') studyRoomId: string,
    @CurrentUser() userId: string,
  ) {
    console.log(
      '⏱️ [StudyRoomsController.markNotCompleted] Endpoint called:',
      { studyRoomId, userId },
    );
    return this.studyRoomsService.markNotCompleted(studyRoomId, userId);
  }

  @Get(':studyRoomId/is-host')
  @UseGuards(ClerkAuthGuard)
  async checkIsHost(
    @Param('studyRoomId') studyRoomId: string,
    @CurrentUser() userId: string,
  ) {
    return this.studyRoomsService.checkIsHost(studyRoomId, userId);
  }

  @Post(':studyRoomId/feedback')
  @UseGuards(ClerkAuthGuard)
  async submitSessionFeedback(
    @Param('studyRoomId') studyRoomId: string,
    @CurrentUser() userId: string,
    @Body() feedbackDto: SessionFeedbackDto,
  ) {
    console.log(
      '📝 [StudyRoomsController.submitSessionFeedback] Endpoint called:',
      { studyRoomId, userId, isHost: feedbackDto.isHost },
    );
    return this.studyRoomsService.saveSessionFeedback(
      studyRoomId,
      userId,
      feedbackDto,
    );
  }
}
