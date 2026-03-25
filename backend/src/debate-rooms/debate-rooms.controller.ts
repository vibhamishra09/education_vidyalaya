import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DebateRoomsService } from './debate-rooms.service';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { OptionalClerkAuthGuard } from '../common/guards/optional-clerk-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  CreateDebateRoomDto,
  UpdateDebateRoomDto,
  JoinDebateRoomDto,
  DebateRoomQueryDto,
  PromoteModeratorDto,
  BanParticipantDto,
  UpsertModeratorEvaluationDto,
  ModeratorEvaluationsQueryDto,
} from './dto/debate-room.dto';

@Controller('api/debate-rooms')
export class DebateRoomsController {
  constructor(private debateRoomsService: DebateRoomsService) {}

  /**
   * List all debate rooms with optional filters
   */
  @Get()
  async listDebateRooms(@Query() query: DebateRoomQueryDto) {
    return this.debateRoomsService.listDebateRooms(
      query.search,
      query.status as any,
      query.page || 1,
      query.limit || 10,
      query.trending,
      query.sort,
    );
  }

  /**
   * Get a single debate room by ID
   */
  @Get(':roomId')
  @UseGuards(OptionalClerkAuthGuard)
  async getDebateRoom(
    @Param('roomId') roomId: string,
    @CurrentUser('dbUserId') userId?: string,
  ) {
    return this.debateRoomsService.getDebateRoom(roomId, userId);
  }

  /**
   * Create a new debate room
   */
  @Post()
  @UseGuards(ClerkAuthGuard)
  async createDebateRoom(
    @CurrentUser('dbUserId') userId: string,
    @Body() dto: CreateDebateRoomDto,
  ) {
    return this.debateRoomsService.createDebateRoom(userId, dto);
  }

  /**
   * Update debate room settings (host only, until debate is finished or cancelled)
   */
  @Patch(':roomId')
  @UseGuards(ClerkAuthGuard)
  async updateDebateRoom(
    @Param('roomId') roomId: string,
    @CurrentUser() userId: string,
    @Body() dto: UpdateDebateRoomDto,
  ) {
    return this.debateRoomsService.updateDebateRoom(roomId, userId, dto);
  }

  /**
   * Join a debate room as a participant
   */
  @Post(':roomId/join')
  @UseGuards(ClerkAuthGuard)
  async joinDebateRoom(
    @Param('roomId') roomId: string,
    @CurrentUser('dbUserId') userId: string,
    @Body() dto?: JoinDebateRoomDto,
  ) {
    return this.debateRoomsService.joinDebateRoom(roomId, userId, dto);
  }

  /**
   * Leave a debate room
   */
  @Post(':roomId/leave')
  @UseGuards(ClerkAuthGuard)
  async leaveDebateRoom(
    @Param('roomId') roomId: string,
    @CurrentUser('dbUserId') userId: string,
  ) {
    await this.debateRoomsService.leaveDebateRoom(roomId, userId);
    return { success: true };
  }

  /**
   * Promote a user to moderator (host only)
   */
  @Post(':roomId/moderators')
  @UseGuards(ClerkAuthGuard)
  async promoteModerator(
    @Param('roomId') roomId: string,
    @CurrentUser('dbUserId') userId: string,
    @Body() dto: PromoteModeratorDto,
  ) {
    await this.debateRoomsService.promoteModerator(roomId, userId, dto.userId);
    return { success: true };
  }

  /**
   * Ban/kick a participant (moderator only)
   */
  @Post(':roomId/ban')
  @UseGuards(ClerkAuthGuard)
  async banParticipant(
    @Param('roomId') roomId: string,
    @CurrentUser('dbUserId') userId: string,
    @Body() dto: BanParticipantDto,
  ) {
    await this.debateRoomsService.banParticipant(
      roomId,
      userId,
      dto.participantUserId,
      dto.reason,
    );
    return { success: true };
  }

  /**
   * Start the prep phase (moderator only)
   */
  @Post(':roomId/start-prep')
  @UseGuards(ClerkAuthGuard)
  async startPrepPhase(
    @Param('roomId') roomId: string,
    @CurrentUser('dbUserId') userId: string,
  ) {
    return this.debateRoomsService.startPrepPhase(roomId, userId);
  }

  /**
   * Generate debate results from judges' evaluations (moderator only)
   */
  @Post(':roomId/generate-results')
  @UseGuards(ClerkAuthGuard)
  async generateResults(
    @Param('roomId') roomId: string,
    @CurrentUser('dbUserId') userId: string,
  ) {
    return this.debateRoomsService.generateResults(roomId, userId);
  }

  /**
   * Get debate results (respects privacy rules)
   */
  @Get(':roomId/results')
  @UseGuards(ClerkAuthGuard)
  async getResults(
    @Param('roomId') roomId: string,
    @CurrentUser('dbUserId') userId: string,
  ) {
    return this.debateRoomsService.getResults(roomId, userId);
  }

  /**
   * Get LiveKit token for debate room
   */
  @Get(':roomId/token')
  @UseGuards(ClerkAuthGuard)
  async getLivekitToken(
    @Param('roomId') roomId: string,
    @CurrentUser('dbUserId') userId: string,
  ) {
    const token = await this.debateRoomsService.getLivekitToken(roomId, userId);
    const serverUrl =
      process.env.LIVEKIT_URL ||
      process.env.LIVEKIT_SERVER_URL ||
      process.env.LIVEKIT_WS_URL;

    // Get debate room to fetch livekitRoomName
    const debateRoom = await this.debateRoomsService.getDebateRoom(roomId);
    const roomName = debateRoom.livekitRoomName || roomId;

    // console.log('[DebateRooms] Token endpoint called for room:', roomId);
    // console.log('[DebateRooms] User:', userId);
    // console.log('[DebateRooms] Token generated:', token ? `${token.substring(0, 50)}...` : 'MISSING');
    // console.log('[DebateRooms] Server URL:', serverUrl || 'MISSING');
    // console.log('[DebateRooms] Room Name:', roomName);

    return {
      token,
      serverUrl: serverUrl,
      roomName,
    };
  }

  /**
   * Get current debate state
   */
  @Get(':roomId/state')
  @UseGuards(ClerkAuthGuard)
  async getDebateState(@Param('roomId') roomId: string) {
    const state = await this.debateRoomsService.getDebateState(roomId);
    return { state };
  }

  /**
   * Create/update moderator evaluation (private per moderator)
   */
  @Post(':roomId/evaluations')
  @UseGuards(ClerkAuthGuard)
  async upsertModeratorEvaluation(
    @Param('roomId') roomId: string,
    @CurrentUser('dbUserId') userId: string,
    @Body() dto: UpsertModeratorEvaluationDto,
  ) {
    const evaluation =
      await this.debateRoomsService.createOrUpdateModeratorEvaluation(
        roomId,
        userId,
        dto,
      );
    return { evaluation };
  }

  /**
   * Get current moderator evaluations for a room
   */
  @Get(':roomId/evaluations')
  @UseGuards(ClerkAuthGuard)
  async getModeratorEvaluations(
    @Param('roomId') roomId: string,
    @CurrentUser('dbUserId') userId: string,
    @Query() query: ModeratorEvaluationsQueryDto,
  ) {
    const evaluations = await this.debateRoomsService.getModeratorEvaluations(
      roomId,
      userId,
      query,
    );
    return { evaluations };
  }

  /**
   * Get current moderator evaluations for one participant
   */
  @Get(':roomId/evaluations/:participantId')
  @UseGuards(ClerkAuthGuard)
  async getParticipantEvaluations(
    @Param('roomId') roomId: string,
    @Param('participantId') participantId: string,
    @CurrentUser('dbUserId') userId: string,
    @Query() query: ModeratorEvaluationsQueryDto,
  ) {
    const evaluations = await this.debateRoomsService.getParticipantEvaluations(
      roomId,
      userId,
      participantId,
      query.turnNumber,
    );
    return { evaluations };
  }

  /**
   * Cancel a debate (host only)
   */
  @Delete(':roomId')
  @UseGuards(ClerkAuthGuard)
  async cancelDebate(
    @Param('roomId') roomId: string,
    @CurrentUser('dbUserId') userId: string,
  ) {
    await this.debateRoomsService.cancelDebate(roomId, userId);
    return { success: true };
  }
}
