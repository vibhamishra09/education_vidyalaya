import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { RecordingService } from './recording.service';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/recording')
export class RecordingController {
  constructor(
    private readonly recordingService: RecordingService,
    private readonly prisma: PrismaService,
  ) {}

  @UseGuards(ClerkAuthGuard)
  @Get()
  async getUserRecordings(
    @CurrentUser('dbUserId') dbUserId: string | undefined,
    @CurrentUser('clerkId') clerkUserId: string,
    @Query('title') title?: string,
    @Query('date') date?: string,
  ) {
    const userId = await this.resolveUserId(dbUserId, clerkUserId);
    return this.recordingService.getUserRecordings(userId, { title, date });
  }

  @UseGuards(ClerkAuthGuard)
  @Get(':roomId')
  async getRecordingsByRoom(
    @CurrentUser('dbUserId') dbUserId: string | undefined,
    @CurrentUser('clerkId') clerkUserId: string,
    @Param('roomId') roomId: string,
    @Query('title') title?: string,
    @Query('date') date?: string,
  ) {
    const userId = await this.resolveUserId(dbUserId, clerkUserId);
    return this.recordingService.getRecordingsByRoom(roomId, userId, {
      title,
      date,
    });
  }

  @UseGuards(ClerkAuthGuard)
  @Post('start')
  async startRecording(
    @CurrentUser('dbUserId') dbUserId: string | undefined,
    @CurrentUser('clerkId') clerkUserId: string,
    @Body() body: { roomId: string },
  ) {
    const userId = await this.resolveUserId(dbUserId, clerkUserId);
    return this.recordingService.startRecording(body.roomId, userId);
  }

  @UseGuards(ClerkAuthGuard)
  @Post('stop')
  async stopRecording(
    @CurrentUser('dbUserId') dbUserId: string | undefined,
    @CurrentUser('clerkId') clerkUserId: string,
    @Body() body: { roomId: string },
  ) {
    const userId = await this.resolveUserId(dbUserId, clerkUserId);
    return this.recordingService.stopRecording(body.roomId, userId);
  }

  private async resolveUserId(dbUserId: string | undefined, clerkUserId: string): Promise<string> {
    if (dbUserId) return dbUserId;
    const user = await this.prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });
    if (!user) {
      throw new UnauthorizedException('User not found in database');
    }
    return user.id;
  }
}
