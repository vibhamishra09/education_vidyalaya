import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ScratchPadService } from './scratch-pad.service';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
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
  async getScratchPad(@Param('roomId') roomId: string) {
    const data = await this.scratchPadService.getScratchPad(roomId);
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
    @Body('roomTitle') roomTitle?: string
  ) {
    return this.scratchPadService.saveScratchPad(userId, roomId, content, roomTitle);
  }
}
