import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PeerSessionsService } from './peer-sessions.service';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { OptionalClerkAuthGuard } from '../common/guards/optional-clerk-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  RequestSessionDto,
  UpdateSessionStatusDto,
} from './dto/peer-session.dto';
import { SessionFeedbackDto } from '../common/dto/session-feedback.dto';
import { SessionStatus } from '@prisma/client';

@Controller('api/peer-sessions')
export class PeerSessionsController {
  constructor(private peerSessionsService: PeerSessionsService) {}

  @Get()
  @UseGuards(ClerkAuthGuard)
  async getPeerSessions(
    @CurrentUser() userId: string,
    @Query('status') status?: SessionStatus,
    @Query('requestedBy') requestedBy?: string,
    @Query('requestedTo') requestedTo?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    console.log('userId', userId);
    return this.peerSessionsService.getPeerSessions(
      userId,
      status,
      requestedBy,
      requestedTo,
      page || 1,
      limit || 10,
    );
  }

  @Get(':peerSessionId')
  @UseGuards(OptionalClerkAuthGuard)
  async getPeerSessionDetails(
    @Param('peerSessionId') peerSessionId: string,
    @CurrentUser() userId?: string,
  ) {
    return this.peerSessionsService.getPeerSessionDetails(
      peerSessionId,
      userId,
    );
  }

  @Post()
  @UseGuards(ClerkAuthGuard)
  async requestPeerSession(
    @CurrentUser() userId: string,
    @Body() requestDto: RequestSessionDto,
  ) {
    return this.peerSessionsService.requestPeerSession(userId, requestDto);
  }

  @Patch(':peerSessionId/status')
  @UseGuards(ClerkAuthGuard)
  async updatePeerSessionStatus(
    @Param('peerSessionId') peerSessionId: string,
    @CurrentUser() userId: string,
    @Body() updateDto: UpdateSessionStatusDto,
  ) {
    return this.peerSessionsService.updatePeerSessionStatus(
      peerSessionId,
      userId,
      updateDto,
    );
  }

  @Patch(':peerSessionId/accept')
  @UseGuards(ClerkAuthGuard)
  async acceptPeerSession(
    @Param('peerSessionId') peerSessionId: string,
    @CurrentUser() userId: string,
  ) {
    return this.peerSessionsService.acceptPeerSession(peerSessionId, userId);
  }

  @Patch(':peerSessionId/reject')
  @UseGuards(ClerkAuthGuard)
  async rejectPeerSession(
    @Param('peerSessionId') peerSessionId: string,
    @CurrentUser() userId: string,
  ) {
    return this.peerSessionsService.rejectPeerSession(peerSessionId, userId);
  }

  @Patch(':peerSessionId/complete')
  @UseGuards(ClerkAuthGuard)
  async completePeerSession(
    @Param('peerSessionId') peerSessionId: string,
    @CurrentUser() userId: string,
  ) {
    console.log(
      '🎯 [PeerSessionsController.completePeerSession] Endpoint called:',
      { peerSessionId, userId },
    );
    const result = await this.peerSessionsService.completePeerSession(
      peerSessionId,
      userId,
    );
    console.log(
      '✅ [PeerSessionsController.completePeerSession] Completed successfully',
    );
    return result;
  }

  @Get(':peerSessionId/is-host')
  @UseGuards(ClerkAuthGuard)
  async checkIsHost(
    @Param('peerSessionId') peerSessionId: string,
    @CurrentUser() userId: string,
  ) {
    return this.peerSessionsService.checkIsHost(peerSessionId, userId);
  }

  @Patch(':peerSessionId/not-completed')
  @UseGuards(ClerkAuthGuard)
  async markNotCompleted(
    @Param('peerSessionId') peerSessionId: string,
    @CurrentUser() userId: string,
  ) {
    console.log(
      '⏱️ [PeerSessionsController.markNotCompleted] Endpoint called:',
      { peerSessionId, userId },
    );
    return this.peerSessionsService.markNotCompleted(peerSessionId, userId);
  }

  @Post(':peerSessionId/feedback')
  @UseGuards(ClerkAuthGuard)
  async submitSessionFeedback(
    @Param('peerSessionId') peerSessionId: string,
    @CurrentUser() userId: string,
    @Body() feedbackDto: SessionFeedbackDto,
  ) {
    console.log(
      '📝 [PeerSessionsController.submitSessionFeedback] Endpoint called:',
      { peerSessionId, userId, isHost: feedbackDto.isHost },
    );
    return this.peerSessionsService.saveSessionFeedback(
      peerSessionId,
      userId,
      feedbackDto,
    );
  }
}
