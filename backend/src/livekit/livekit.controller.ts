import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { LivekitService } from './livekit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { StudyRoomsService } from '../study-rooms/study-rooms.service';
import { StudyRoomParticipantRole } from '../generated/prisma/client';

@Controller('api/livekit')
export class LivekitController {
  constructor(
    private readonly livekit: LivekitService,
    private readonly prisma: PrismaService,
    private readonly studyRoomsService: StudyRoomsService,
  ) {}

  @Post('token')
  @UseGuards(ClerkAuthGuard)
  async token(
    @Body()
    body: {
      roomName: string;
      publish?: boolean;
      subscribe?: boolean;
      metadata?: string;
    },
    @Req() req: any,
  ) {
    const identity = req.userId as string;

    // Fetch user's display name and avatar from database
    const user = await this.prisma.user.findUnique({
      where: { clerkId: identity },
      select: { name: true, avatar: true },
    });

    // Include avatar URL in metadata for display in video room
    const userMetadata = JSON.stringify({
      avatar: user?.avatar || null,
      ...(body.metadata ? JSON.parse(body.metadata) : {}),
    });

    const token = await this.livekit.createToken({
      roomName: body.roomName,
      identity,
      name: user?.name || undefined,
      metadata: userMetadata,
      publish: body.publish,
      subscribe: body.subscribe,
    });
    return { token };
  }

  @Post('guest-token')
  async guestToken(
    @Body()
    body: {
      roomName: string;
      guestAccessToken: string;
    },
  ) {
    const roomId = body.roomName.startsWith('studyroom-')
      ? body.roomName.replace('studyroom-', '')
      : body.roomName;
    const guestToken = await this.studyRoomsService.validateGuestAccessToken(
      roomId,
      body.guestAccessToken,
    );

    const metadata = JSON.stringify({
      avatar: null,
      guest: true,
      role: guestToken.guestParticipant.role,
    });
    const token = await this.livekit.createToken({
      roomName: body.roomName,
      identity: guestToken.guestParticipant.livekitIdentity,
      name: guestToken.guestParticipant.name,
      metadata,
      publish: false,
      subscribe: true,
    });

    return {
      token,
      role: guestToken.guestParticipant.role,
      isHost:
        guestToken.guestParticipant.role === StudyRoomParticipantRole.COHOST,
      identity: guestToken.guestParticipant.livekitIdentity,
      name: guestToken.guestParticipant.name,
    };
  }
}
