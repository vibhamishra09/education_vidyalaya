import { Controller, Post, Body, Param, Get, UseGuards } from '@nestjs/common';
import { MeetingLogService } from './meeting-log.service';

@Controller('api/meetings')
export class MeetingLogController {
  constructor(private readonly meetingLogService: MeetingLogService) {}

  @Post(':meetingId/logs')
  async createLog(
    @Param('meetingId') meetingId: string,
    @Body() body: { participantIdentity: string; event: string; details: any },
  ) {
    return this.meetingLogService.createLog(
      meetingId,
      body.participantIdentity,
      body.event,
      body.details,
    );
  }

  @Get(':meetingId/logs')
  async getLogs(@Param('meetingId') meetingId: string) {
    return this.meetingLogService.getLogsByMeeting(meetingId);
  }
}
