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
import { AvailabilityService } from './availability.service';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  UserAvailabilityDto,
  SetAvailabilityDto,
  UpdateAvailabilityDto,
  CreateBlockedSlotDto,
  UpdateUserPreferencesDto,
} from './dto/availability.dto';

@Controller('api/availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  /**
   * GET /api/availability/preferences - Get user's booking preferences
   * IMPORTANT: This must come BEFORE the :userId route to avoid conflicts
   */
  @Get('preferences')
  @UseGuards(ClerkAuthGuard)
  async getMyPreferences(@CurrentUser() userId: string) {
    return this.availabilityService.getUserPreferences(userId);
  }

  /**
   * PATCH /api/availability/preferences - Update user's booking preferences
   * IMPORTANT: This must come BEFORE the :availabilityId route to avoid conflicts
   */
  @Patch('preferences')
  @UseGuards(ClerkAuthGuard)
  async updatePreferences(
    @CurrentUser() userId: string,
    @Body() data: UpdateUserPreferencesDto,
  ) {
    console.log(data);
    return this.availabilityService.updateUserPreferences(userId, data);
  }

  /**
   * GET /api/availability/blocked/slots - Get all blocked time slots
   * IMPORTANT: This must come BEFORE the :userId route to avoid conflicts
   */
  @Get('blocked/slots')
  @UseGuards(ClerkAuthGuard)
  async getBlockedSlots(@CurrentUser() userId: string) {
    return this.availabilityService.getBlockedSlots(userId);
  }

  /**
   * GET /api/availability/blocked/:userId/slots - Get specific user's blocked slots (public)
   */
  @Get('blocked/:userId/slots')
  async getUserBlockedSlots(@Param('userId') userId: string) {
    return this.availabilityService.getBlockedSlots(userId);
  }

  /**
   * POST /api/availability/blocked - Create a blocked time slot
   */
  @Post('blocked')
  @UseGuards(ClerkAuthGuard)
  async createBlockedSlot(
    @CurrentUser() userId: string,
    @Body() data: CreateBlockedSlotDto
  ) {
    return this.availabilityService.createBlockedSlot(userId, data);
  }

  /**
   * DELETE /api/availability/blocked/:blockedSlotId - Delete a blocked time slot
   */
  @Delete('blocked/:blockedSlotId')
  @UseGuards(ClerkAuthGuard)
  async deleteBlockedSlot(
    @CurrentUser() userId: string,
    @Param('blockedSlotId') blockedSlotId: string,
  ) {
    return this.availabilityService.deleteBlockedSlot(userId, blockedSlotId);
  }

  /**
   * POST /api/availability/day - Set availability for a specific day
   */
  @Post('day')
  @UseGuards(ClerkAuthGuard)
  async setDayAvailability(
    @CurrentUser() userId: string,
    @Body() data: UserAvailabilityDto,
  ) {
    return this.availabilityService.setDayAvailability(userId, data);
  }

  /**
   * POST /api/availability/bulk - Set availability for multiple days at once
   */
  @Post('bulk')
  @UseGuards(ClerkAuthGuard)
  async setMultipleDaysAvailability(
    @CurrentUser() userId: string,
    @Body() data: SetAvailabilityDto,
  ) {
    return this.availabilityService.setMultipleDaysAvailability(userId, data);
  }

  /**
   * GET /api/availability/check/:userId - Check if a specific time is available for a user
   * Query params: startTime (ISO date), duration (minutes)
   */
  @Get('check/:userId')
  async checkAvailability(
    @Param('userId') userId: string,
    @Query('startTime') startTime: string,
    @Query('duration') duration: string,
  ) {
    const durationNum = parseInt(duration, 10) || 60;
    const startDate = new Date(startTime);

    if (isNaN(startDate.getTime())) {
      return {
        isAvailable: false,
        reason: 'Invalid date format',
      };
    }

    return this.availabilityService.checkTimeSlotAvailability(
      userId,
      startDate,
      durationNum,
    );
  }

  /**
   * GET /api/availability/summary/:userId - Get availability summary for a date range
   * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
   * Returns dates with at least one available slot for each preset duration (15, 30, 60, 120 min)
   */
  @Get('summary/:userId')
  async getAvailabilitySummary(
    @Param('userId') userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.availabilityService.getAvailabilitySummary(
      userId,
      startDate,
      endDate,
    );
  }

  /**
   * GET /api/availability/detailed/:userId - Get detailed available slots for a specific date and duration
   * Query params: date (YYYY-MM-DD), duration (minutes)
   * Returns all available time slots in 15-minute intervals
   */
  @Get('detailed/:userId')
  async getDetailedSlots(
    @Param('userId') userId: string,
    @Query('date') date: string,
    @Query('duration') duration: string,
  ) {
    const durationNum = parseInt(duration, 10) || 60;

    return this.availabilityService.getDetailedSlotsForDate(
      userId,
      date,
      durationNum,
    );
  }

  /**
   * GET /api/availability/slots/:userId - Get available slots for a specific date
   * Query params: date (YYYY-MM-DD), duration (minutes), interval (minutes)
   */
  @Get('slots/:userId')
  async getAvailableSlots(
    @Param('userId') userId: string,
    @Query('date') date: string,
    @Query('duration') duration: string,
    @Query('interval') interval: string,
    @Query('durations') durations?: string,
  ) {
    const durationNum = parseInt(duration, 10) || 60;
    const intervalNum = parseInt(interval, 10) || 30;
    const parsedDurations = durations
      ? durations
          .split(',')
          .map((value) => parseInt(value.trim(), 10))
          .filter((value) => !isNaN(value) && value > 0)
      : undefined;

    return this.availabilityService.getAvailableSlotsForDate(
      userId,
      date,
      durationNum,
      intervalNum,
      parsedDurations,
    );
  }

  /**
   * GET /api/availability - Get current user's availability settings
   */
  @Get()
  @UseGuards(ClerkAuthGuard)
  async getMyAvailability(@CurrentUser() userId: string) {
    return this.availabilityService.getUserAvailability(userId);
  }

  /**
   * GET /api/availability/:userId - Get specific user's availability settings (public)
   */
  @Get(':userId')
  async getUserAvailability(@Param('userId') userId: string) {
    return this.availabilityService.getUserAvailability(userId);
  }

  /**
   * PATCH /api/availability/:availabilityId - Update availability for a specific day
   */
  @Patch(':availabilityId')
  @UseGuards(ClerkAuthGuard)
  async updateDayAvailability(
    @CurrentUser() userId: string,
    @Param('availabilityId') availabilityId: string,
    @Body() data: UpdateAvailabilityDto,
  ) {
    return this.availabilityService.updateDayAvailability(
      userId,
      availabilityId,
      data,
    );
  }

  /**
   * DELETE /api/availability/:availabilityId - Delete availability for a specific day
   */
  @Delete(':availabilityId')
  @UseGuards(ClerkAuthGuard)
  async deleteDayAvailability(
    @CurrentUser() userId: string,
    @Param('availabilityId') availabilityId: string,
  ) {
    return this.availabilityService.deleteDayAvailability(
      userId,
      availabilityId,
    );
  }
}
