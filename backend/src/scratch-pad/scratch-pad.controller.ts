import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ScratchPadService } from './scratch-pad.service';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { OptionalClerkAuthGuard } from '../common/guards/optional-clerk-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api/scratch-pad')
export class ScratchPadController {
  constructor(private readonly scratchPadService: ScratchPadService) {}

  /**
   * List user's saved scratch pads
   */
  @Get('history')
  @UseGuards(ClerkAuthGuard)
  async getUserHistory(@CurrentUser() userId: string) {
    return this.scratchPadService.getUserHistory(userId);
  }

  /**
   * Get the saved scratch pad data for a specific room
   */
  @Get(':roomId')
  @UseGuards(OptionalClerkAuthGuard)
  async getScratchPad(
    @Param('roomId') roomId: string,
    @Req() req: any
  ) {
    // Optional user ID for personal pad lookup
    const userId = req.auth?.userId; // Clerk usually puts this in req.auth or req.user
    const data = await this.scratchPadService.getScratchPad(roomId, userId);
    if (!data) return { content: null };
    return data;
  }

  /**
   * Save the scratch pad data for a room
   */
  @Post(':roomId')
  @UseGuards(ClerkAuthGuard)
  async saveScratchPad(
    @Param('roomId') roomId: string, 
    @CurrentUser() userId: string, 
    @Body('content') content: any,
    @Body('roomTitle') roomTitle?: string,
    @Body('isPersonal') isPersonal?: boolean
  ) {
    console.log(`[ScratchPadController] Saving pad: roomId=${roomId}, userId=${userId}, isPersonal=${isPersonal}, hasContent=${!!content}`);
    return this.scratchPadService.saveScratchPad(userId, roomId, content, roomTitle, isPersonal !== false);
  }
}
