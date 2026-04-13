import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MeetingLogService {
  private readonly logger = new Logger(MeetingLogService.name);

  constructor(private prisma: PrismaService) {}

  async createLog(meetingId: string, participantIdentity: string, event: string, details: any) {
    // try {
    //   return await this.prisma.meetingLog.create({
    //     data: {
    //       meetingId,
    //       participantIdentity,
    //       event,
    //       details,
    //     },
    //   });
    // } catch (error) {
    //   this.logger.error(`Failed to create meeting log: ${error.message}`, error.stack);
    //   // We don't throw here to avoid failing the request if logging fails during a meeting
    // }
  }

  async getLogsByMeeting(meetingId: string) {
  //   return this.prisma.meetingLog.findMany({
  //     where: { meetingId },
  //     orderBy: { createdAt: 'asc' },
  //   });
  }
}
