import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { LivekitService } from './livekit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';

@UseGuards(ClerkAuthGuard)
@Controller('api/livekit')
export class LivekitController {
  constructor(
    private readonly livekit: LivekitService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('token')
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
    
    // Fetch user's display name from database
    const user = await this.prisma.user.findUnique({
      where: { clerkId: identity },
      select: { name: true },
    });
    
    const token = await this.livekit.createToken({
      roomName: body.roomName,
      identity,
      name: user?.name || undefined,
      metadata: body.metadata,
      publish: body.publish,
      subscribe: body.subscribe,
    });
    return { token };
  }
}
