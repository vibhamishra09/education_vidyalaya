import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  UserAvailabilityDto,
  SetAvailabilityDto,
  UpdateAvailabilityDto,
  CreateBlockedSlotDto,
  UpdateUserPreferencesDto,
  CheckAvailabilityDto,
} from './dto/availability.dto';

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  /**
   * Helper method to convert clerkId to database userId
   */
  private async getDbUserId(clerkId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.id;
  }

  /**
   * Get all availability settings for a user
   * Note: userId can be either clerkId or database userId
   */
  async getUserAvailability(userId: string) {
    // Try to find user by clerkId first, if not found, assume it's already a database userId
    let dbUserId = userId;
    const userByClerkId = await this.prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });
    if (userByClerkId) {
      dbUserId = userByClerkId.id;
    }
    const availability = await this.prisma.userAvailability.findMany({
      where: { userId: dbUserId },
      orderBy: { dayOfWeek: 'asc' },
    });

    return { availability };
  }

  /**
   * Set or update availability for a specific day
   */
  async setDayAvailability(
    userId: string, // This is clerkId
    data: UserAvailabilityDto,
  ) {
    const dbUserId = await this.getDbUserId(userId);

    // Validate that endTime is after startTime
    if (data.startTime >= data.endTime) {
      throw new BadRequestException('End time must be after start time');
    }

    // Upsert (create or update) availability for the day
    const availability = await this.prisma.userAvailability.upsert({
      where: {
        userId_dayOfWeek: {
          userId: dbUserId,
          dayOfWeek: data.dayOfWeek,
        },
      },
      create: {
        userId: dbUserId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        isActive: data.isActive ?? true,
      },
      update: {
        startTime: data.startTime,
        endTime: data.endTime,
        isActive: data.isActive ?? true,
      },
    });

    return availability;
  }

  /**
   * Set availability for multiple days at once
   */
  async setMultipleDaysAvailability(
    userId: string, // This is clerkId
    data: SetAvailabilityDto,
  ) {
    const dbUserId = await this.getDbUserId(userId);

    // Validate all entries
    for (const avail of data.availability) {
      if (avail.startTime >= avail.endTime) {
        throw new BadRequestException(
          `End time must be after start time for day ${avail.dayOfWeek}`,
        );
      }
    }

    // Use transaction to update all days
    const results = await this.prisma.$transaction(
      data.availability.map((avail) =>
        this.prisma.userAvailability.upsert({
          where: {
            userId_dayOfWeek: {
              userId: dbUserId, // Use database ID instead of clerkId
              dayOfWeek: avail.dayOfWeek,
            },
          },
          create: {
            userId: dbUserId, // Use database ID instead of clerkId
            dayOfWeek: avail.dayOfWeek,
            startTime: avail.startTime,
            endTime: avail.endTime,
            isActive: avail.isActive ?? true,
          },
          update: {
            startTime: avail.startTime,
            endTime: avail.endTime,
            isActive: avail.isActive ?? true,
          },
        }),
      ),
    );

    return { availability: results };
  }

  /**
   * Update availability for a specific day
   */
  async updateDayAvailability(
    userId: string, // This is clerkId
    availabilityId: string,
    data: UpdateAvailabilityDto,
  ) {
    const dbUserId = await this.getDbUserId(userId);

    // Check if availability exists and belongs to user
    const existing = await this.prisma.userAvailability.findUnique({
      where: { id: availabilityId },
    });

    if (!existing) {
      throw new NotFoundException('Availability setting not found');
    }

    if (existing.userId !== dbUserId) {
      throw new ForbiddenException(
        'You cannot update another user\'s availability',
      );
    }

    // Validate time range if both are provided
    const startTime = data.startTime ?? existing.startTime;
    const endTime = data.endTime ?? existing.endTime;

    if (startTime >= endTime) {
      throw new BadRequestException('End time must be after start time');
    }

    const updated = await this.prisma.userAvailability.update({
      where: { id: availabilityId },
      data,
    });

    return updated;
  }

  /**
   * Delete availability for a specific day
   */
  async deleteDayAvailability(userId: string, availabilityId: string) {
    const dbUserId = await this.getDbUserId(userId);

    // Check if availability exists and belongs to user
    const existing = await this.prisma.userAvailability.findUnique({
      where: { id: availabilityId },
    });

    if (!existing) {
      throw new NotFoundException('Availability setting not found');
    }

    if (existing.userId !== dbUserId) {
      throw new ForbiddenException(
        'You cannot delete another user\'s availability',
      );
    }

    await this.prisma.userAvailability.delete({
      where: { id: availabilityId },
    });

    return { message: 'Availability deleted successfully' };
  }

  /**
   * Get all blocked time slots for a user
   * Note: userId can be either clerkId or database userId
   */
  async getBlockedSlots(userId: string) {
    // Try to find user by clerkId first, if not found, assume it's already a database userId
    let dbUserId = userId;
    const userByClerkId = await this.prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });
    if (userByClerkId) {
      dbUserId = userByClerkId.id;
    }

    const blockedSlots = await this.prisma.blockedTimeSlot.findMany({
      where: { userId: dbUserId },
      orderBy: { startTime: 'asc' },
    });

    return { blockedSlots };
  }

  /**
   * Create a blocked time slot
   */
  async createBlockedSlot(userId: string, data: CreateBlockedSlotDto) {
    const dbUserId = await this.getDbUserId(userId);

    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);

    // Validate that endTime is after startTime
    if (startTime >= endTime) {
      throw new BadRequestException('End time must be after start time');
    }

    // Validate that the time slot is in the future
    if (startTime < new Date()) {
      throw new BadRequestException('Cannot block time in the past');
    }

    const blockedSlot = await this.prisma.blockedTimeSlot.create({
      data: {
        userId: dbUserId,
        startTime,
        endTime,
        reason: data.reason,
      },
    });

    return blockedSlot;
  }

  /**
   * Delete a blocked time slot
   */
  async deleteBlockedSlot(userId: string, blockedSlotId: string) {
    const dbUserId = await this.getDbUserId(userId);

    // Check if blocked slot exists and belongs to user
    const existing = await this.prisma.blockedTimeSlot.findUnique({
      where: { id: blockedSlotId },
    });

    if (!existing) {
      throw new NotFoundException('Blocked time slot not found');
    }

    if (existing.userId !== dbUserId) {
      throw new ForbiddenException(
        'You cannot delete another user\'s blocked time slot',
      );
    }

    await this.prisma.blockedTimeSlot.delete({
      where: { id: blockedSlotId },
    });

    return { message: 'Blocked time slot deleted successfully' };
  }

  /**
   * Update user booking preferences (buffer time, advance time, etc.)
   */
  async updateUserPreferences(userId: string, data: UpdateUserPreferencesDto) {
    const dbUserId = await this.getDbUserId(userId);

    const user = await this.prisma.user.update({
      where: { id: dbUserId },
      data: {
        bufferTime: data.bufferTime,
        minAdvanceTime: data.minAdvanceTime,
        maxFutureBooking: data.maxFutureBooking,
      },
      select: {
        id: true,
        bufferTime: true,
        minAdvanceTime: true,
        maxFutureBooking: true,
      },
    });

    return user;
  }

  /**
   * Get user booking preferences
   */
  async getUserPreferences(userId: string) {
    const dbUserId = await this.getDbUserId(userId);

    const user = await this.prisma.user.findUnique({
      where: { id: dbUserId },
      select: {
        id: true,
        bufferTime: true,
        minAdvanceTime: true,
        maxFutureBooking: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Check if a specific time slot is available for a user
   * This checks:
   * 1. User's weekly unavailability blocks
   * 2. Blocked time slots
   * 3. Existing session conflicts (PENDING or UPCOMING)
   * Note: Users are available 24/7 by default. UserAvailability records represent UNAVAILABLE times.
   * Note: userId can be either clerkId or database userId
   */
  async checkTimeSlotAvailability(
    userId: string,
    startTime: Date,
    duration: number,
  ): Promise<{
    isAvailable: boolean;
    reason?: string;
    conflicts?: any[];
  }> {
    // Try to find user by clerkId first, if not found, assume it's already a database userId
    let dbUserId = userId;
    const userByClerkId = await this.prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });
    if (userByClerkId) {
      dbUserId = userByClerkId.id;
    }

    const endTime = new Date(startTime.getTime() + duration * 60000);

    // Get user's preferences
    const user = await this.prisma.user.findUnique({
      where: { id: dbUserId },
      select: {
        bufferTime: true,
        minAdvanceTime: true,
        maxFutureBooking: true,
      },
    });

    if (!user) {
      return { isAvailable: false, reason: 'User not found' };
    }

    // Check 1: Minimum advance time (0 = instant booking allowed)
    const now = new Date();
    const minBookingTime = new Date(
      now.getTime() + (user.minAdvanceTime || 0) * 60000,
    );
    if (startTime < minBookingTime) {
      return {
        isAvailable: false,
        reason: `Booking must be at least ${user.minAdvanceTime || 0} minutes in advance`,
      };
    }

    // Check 2: Maximum future booking (365 days default)
    const maxBookingTime = new Date(
      now.getTime() + (user.maxFutureBooking || 365) * 24 * 60 * 60000,
    );
    if (startTime > maxBookingTime) {
      return {
        isAvailable: false,
        reason: `Cannot book more than ${user.maxFutureBooking || 365} days in advance`,
      };
    }

    // Check 3: Weekly unavailability blocks
    // IMPORTANT: UserAvailability records now represent UNAVAILABLE times, not available times
    // Users are available 24/7 by default unless they have blocked hours
    const dayOfWeek = startTime.getDay(); // 0=Sunday, 6=Saturday
    const timeStr = `${startTime.getUTCHours().toString().padStart(2, '0')}:${startTime.getUTCMinutes().toString().padStart(2, '0')}`;
    const endTimeStr = `${endTime.getUTCHours().toString().padStart(2, '0')}:${endTime.getUTCMinutes().toString().padStart(2, '0')}`;

    const unavailability = await this.prisma.userAvailability.findUnique({
      where: {
        userId_dayOfWeek: {
          userId: dbUserId,
          dayOfWeek,
        },
      },
    });

    // If there's an active unavailability block for this day, check if requested time falls within it
    if (unavailability && unavailability.isActive) {
      // Check if requested time overlaps with the unavailable hours
      // Unavailable if: request starts before block ends AND request ends after block starts
      if (timeStr < unavailability.endTime && endTimeStr > unavailability.startTime) {
        return {
          isAvailable: false,
          reason: `User is not available from ${unavailability.startTime} to ${unavailability.endTime} on this day`,
        };
      }
    }

    // Check 4: Blocked time slots
    const blockedSlots = await this.prisma.blockedTimeSlot.findMany({
      where: {
        userId: dbUserId,
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gt: startTime } },
        ],
      },
    });

    if (blockedSlots.length > 0) {
      return {
        isAvailable: false,
        reason: 'Time slot is blocked',
        conflicts: blockedSlots,
      };
    }

    // Check 5: Existing session conflicts (with buffer time, 0 = no buffer by default)
    const bufferMs = (user.bufferTime || 0) * 60000;
    const startWithBuffer = new Date(startTime.getTime() - bufferMs);
    const endWithBuffer = new Date(endTime.getTime() + bufferMs);

    const conflictingSessions = await this.prisma.peerSession.findMany({
      where: {
        OR: [
          { requestedById: dbUserId },
          { requestedToId: dbUserId },
        ],
        sessionStatus: {
          in: ['PENDING', 'UPCOMING'],
        },
        date: {
          lt: endWithBuffer,
        },
      },
      select: {
        id: true,
        title: true,
        date: true,
        duration: true,
        sessionStatus: true,
      },
    });

    // Filter for actual overlaps considering session end time and buffer
    const actualConflicts = conflictingSessions.filter((session) => {
      const sessionEnd = new Date(
        session.date.getTime() + session.duration * 60000,
      );
      return sessionEnd.getTime() > startWithBuffer.getTime();
    });

    if (actualConflicts.length > 0) {
      return {
        isAvailable: false,
        reason: 'Time slot conflicts with existing session(s)',
        conflicts: actualConflicts,
      };
    }

    return { isAvailable: true };
  }

  /**
   * Get available time slots for a user on a specific date
   * IMPORTANT: Users are available 24/7 by default. UserAvailability records represent UNAVAILABLE times.
   * This method generates slots for the entire day (00:00-23:59) and marks unavailable ones.
   * Note: userId can be either clerkId or database userId
   */
  async getAvailableSlotsForDate(
    userId: string,
    date: string,
    duration: number = 60,
    slotInterval: number = 30, // Generate slots every 30 minutes
    durations?: number[],
  ) {
    // Try to find user by clerkId first, if not found, assume it's already a database userId
    let dbUserId = userId;
    const userByClerkId = await this.prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });
    if (userByClerkId) {
      dbUserId = userByClerkId.id;
    }

    const targetDate = new Date(date);
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const user = await this.prisma.user.findUnique({
      where: { id: dbUserId },
      select: {
        bufferTime: true,
        minAdvanceTime: true,
        maxFutureBooking: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const bufferMs = (user.bufferTime || 0) * 60000;

    const [unavailability, blockedSlots, sessions] = await Promise.all([
      this.prisma.userAvailability.findUnique({
        where: {
          userId_dayOfWeek: {
            userId: dbUserId,
            dayOfWeek: dayStart.getDay(),
          },
        },
        select: { startTime: true, endTime: true, isActive: true },
      }),
      this.prisma.blockedTimeSlot.findMany({
        where: {
          userId: dbUserId,
          startTime: { lt: dayEnd },
          endTime: { gt: dayStart },
        },
        select: { startTime: true, endTime: true },
      }),
      this.prisma.peerSession.findMany({
        where: {
          OR: [{ requestedById: dbUserId }, { requestedToId: dbUserId }],
          sessionStatus: { in: ['PENDING', 'UPCOMING'] },
          date: {
            gte: new Date(dayStart.getTime() - bufferMs),
            lte: new Date(dayEnd.getTime() + bufferMs),
          },
        },
        select: { date: true, duration: true },
      }),
    ]);

    const dayUnavailability =
      unavailability && unavailability.isActive
        ? {
            startTime: unavailability.startTime,
            endTime: unavailability.endTime,
          }
        : undefined;

    const requestedDurations = (
      durations && durations.length > 0 ? durations : [duration]
    )
      .map((value) => Number(value))
      .filter((value) => !Number.isNaN(value) && value > 0);

    if (requestedDurations.length === 0) {
      requestedDurations.push(duration);
    }

    const uniqueDurations = [...new Set(requestedDurations)].sort(
      (a, b) => a - b,
    );

    const slotsByDuration: Record<
      number,
      { startTime: Date; endTime: Date; isAvailable: boolean }[]
    > = {};

    for (const currentDuration of uniqueDurations) {
      const durationSlots: {
        startTime: Date;
        endTime: Date;
        isAvailable: boolean;
      }[] = [];

      for (
        let slotStart = new Date(dayStart);
        slotStart.getTime() + currentDuration * 60000 <= dayEnd.getTime();
        slotStart = new Date(slotStart.getTime() + slotInterval * 60000)
      ) {
        const quickResult = this.evaluateQuickAvailability(
          slotStart,
          currentDuration,
          dayUnavailability,
          blockedSlots,
          sessions,
          user,
        );

        durationSlots.push({
          startTime: new Date(slotStart),
          endTime: new Date(slotStart.getTime() + currentDuration * 60000),
          isAvailable: quickResult.isAvailable,
        });
      }

      slotsByDuration[currentDuration] = durationSlots;
    }

    const defaultDuration = uniqueDurations[0];

    return {
      availableSlots: slotsByDuration[defaultDuration] || [],
      slotsByDuration,
    };
  }

  /**
   * Get availability summary for a date range with preset durations
   * More efficient approach - returns dates with at least one available slot for each duration
   * Preset durations: 15min, 30min, 60min, 120min
   */
  async getAvailabilitySummary(
    userId: string,
    startDate: string,
    endDate: string,
  ) {
    // Try to find user by clerkId first
    let dbUserId = userId;
    const userByClerkId = await this.prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });
    if (userByClerkId) {
      dbUserId = userByClerkId.id;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get all unavailability blocks, blocked slots, and sessions for the date range
    const [unavailabilityBlocks, blockedSlots, sessions, user] = await Promise.all([
      this.prisma.userAvailability.findMany({
        where: { userId: dbUserId, isActive: true },
      }),
      this.prisma.blockedTimeSlot.findMany({
        where: {
          userId: dbUserId,
          startTime: { lte: end },
          endTime: { gte: start },
        },
      }),
      this.prisma.peerSession.findMany({
        where: {
          OR: [{ requestedById: dbUserId }, { requestedToId: dbUserId }],
          sessionStatus: { in: ['PENDING', 'UPCOMING'] },
          date: { gte: start, lte: end },
        },
        select: { date: true, duration: true },
      }),
      this.prisma.user.findUnique({
        where: { id: dbUserId },
        select: { bufferTime: true, minAdvanceTime: true, maxFutureBooking: true },
      }),
    ]);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const availabilitySummary: Record<string, {
      date: string;
      hasSlots: { '15': boolean; '30': boolean; '60': boolean; '120': boolean };
    }> = {};

    // Iterate through each day in the range
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay();

      // Get unavailability block for this day of week
      const unavailBlock = unavailabilityBlocks.find(
        (block) => block.dayOfWeek === dayOfWeek,
      );

      availabilitySummary[dateStr] = {
        date: dateStr,
        hasSlots: { '15': false, '30': false, '60': false, '120': false },
      };

      // Quick check for each duration
      const durations = [15, 30, 60, 120];
      for (const duration of durations) {
        // Sample a few time slots throughout the day to see if any are available
        const sampleTimes = [
          { hour: 9, minute: 0 },
          { hour: 12, minute: 0 },
          { hour: 15, minute: 0 },
          { hour: 18, minute: 0 },
        ];

        for (const { hour, minute } of sampleTimes) {
          const testTime = new Date(currentDate);
          testTime.setHours(hour, minute, 0, 0);

          const quickResult = this.evaluateQuickAvailability(
            testTime,
            duration,
            unavailBlock,
            blockedSlots,
            sessions,
            user,
          );

          if (quickResult.isAvailable) {
            availabilitySummary[dateStr].hasSlots[duration.toString()] = true;
            break; // Found at least one slot for this duration
          }
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return { summary: Object.values(availabilitySummary) };
  }

  /**
   * Quick availability check without database queries (uses pre-fetched data)
   */
  private quickAvailabilityCheck(
    startTime: Date,
    duration: number,
    unavailBlock: { startTime: string; endTime: string } | undefined,
    blockedSlots: { startTime: Date; endTime: Date }[],
    sessions: { date: Date; duration: number }[],
    user: { bufferTime: number; minAdvanceTime: number; maxFutureBooking: number },
  ): boolean {
    return this.evaluateQuickAvailability(
      startTime,
      duration,
      unavailBlock,
      blockedSlots,
      sessions,
      user,
    ).isAvailable;
  }

  private evaluateQuickAvailability(
    startTime: Date,
    duration: number,
    unavailBlock: { startTime: string; endTime: string } | undefined,
    blockedSlots: { startTime: Date; endTime: Date }[],
    sessions: { date: Date; duration: number }[],
    user: { bufferTime: number; minAdvanceTime: number; maxFutureBooking: number },
  ): { isAvailable: boolean; reason?: string } {
    const endTime = new Date(startTime.getTime() + duration * 60000);
    const now = new Date();

    // Check minimum advance time
    const minBookingTime = new Date(
      now.getTime() + (user.minAdvanceTime || 0) * 60000,
    );
    if (startTime < minBookingTime) {
      return {
        isAvailable: false,
        reason: `Booking must be at least ${user.minAdvanceTime || 0} minutes in advance`,
      };
    }

    // Check maximum future booking
    const maxBookingTime = new Date(
      now.getTime() + (user.maxFutureBooking || 365) * 24 * 60 * 60000,
    );
    if (startTime > maxBookingTime) {
      return {
        isAvailable: false,
        reason: `Cannot book more than ${user.maxFutureBooking || 365} days in advance`,
      };
    }

    // Check unavailability block
    if (unavailBlock) {
      const timeStr = `${startTime.getUTCHours().toString().padStart(2, '0')}:${startTime.getUTCMinutes().toString().padStart(2, '0')}`;
      const endTimeStr = `${endTime.getUTCHours().toString().padStart(2, '0')}:${endTime.getUTCMinutes().toString().padStart(2, '0')}`;

      if (timeStr < unavailBlock.endTime && endTimeStr > unavailBlock.startTime) {
        return {
          isAvailable: false,
          reason: `User is not available from ${unavailBlock.startTime} to ${unavailBlock.endTime}`,
        };
      }
    }

    // Check blocked time slots
    for (const slot of blockedSlots) {
      if (startTime < slot.endTime && endTime > slot.startTime) {
        return { isAvailable: false, reason: 'Time slot is blocked' };
      }
    }

    // Check existing sessions with buffer
    const bufferMs = (user.bufferTime || 0) * 60000;
    const startWithBuffer = new Date(startTime.getTime() - bufferMs);
    const endWithBuffer = new Date(endTime.getTime() + bufferMs);

    for (const session of sessions) {
      const sessionEnd = new Date(
        session.date.getTime() + session.duration * 60000,
      );
      if (
        session.date < endWithBuffer &&
        sessionEnd.getTime() > startWithBuffer.getTime()
      ) {
        return {
          isAvailable: false,
          reason: 'Time slot conflicts with existing session(s)',
        };
      }
    }

    return { isAvailable: true };
  }

  /**
   * Get detailed available slots for a specific date and duration
   * This is called when user hovers/clicks on a date
   */
  async getDetailedSlotsForDate(
    userId: string,
    date: string,
    duration: number,
  ) {
    // Try to find user by clerkId first
    let dbUserId = userId;
    const userByClerkId = await this.prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });
    if (userByClerkId) {
      dbUserId = userByClerkId.id;
    }

    const targetDate = new Date(date);
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const user = await this.prisma.user.findUnique({
      where: { id: dbUserId },
      select: {
        bufferTime: true,
        minAdvanceTime: true,
        maxFutureBooking: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const bufferMs = (user.bufferTime || 0) * 60000;
    const [unavailability, blockedSlots, sessions] = await Promise.all([
      this.prisma.userAvailability.findUnique({
        where: {
          userId_dayOfWeek: {
            userId: dbUserId,
            dayOfWeek: dayStart.getDay(),
          },
        },
        select: { startTime: true, endTime: true, isActive: true },
      }),
      this.prisma.blockedTimeSlot.findMany({
        where: {
          userId: dbUserId,
          startTime: { lt: dayEnd },
          endTime: { gt: dayStart },
        },
        select: { startTime: true, endTime: true },
      }),
      this.prisma.peerSession.findMany({
        where: {
          OR: [{ requestedById: dbUserId }, { requestedToId: dbUserId }],
          sessionStatus: { in: ['PENDING', 'UPCOMING'] },
          date: {
            gte: new Date(dayStart.getTime() - bufferMs),
            lte: new Date(dayEnd.getTime() + bufferMs),
          },
        },
        select: { date: true, duration: true },
      }),
    ]);

    const dayUnavailability =
      unavailability && unavailability.isActive
        ? {
            startTime: unavailability.startTime,
            endTime: unavailability.endTime,
          }
        : undefined;

    const allSlots: {
      startTime: Date;
      endTime: Date;
      isAvailable: boolean;
      reason?: string;
    }[] = [];

    for (
      let slotStart = new Date(dayStart);
      slotStart.getTime() + duration * 60000 <= dayEnd.getTime();
      slotStart = new Date(slotStart.getTime() + 15 * 60000)
    ) {
      const quickResult = this.evaluateQuickAvailability(
        slotStart,
        duration,
        dayUnavailability,
        blockedSlots,
        sessions,
        user,
      );

      allSlots.push({
        startTime: new Date(slotStart),
        endTime: new Date(slotStart.getTime() + duration * 60000),
        isAvailable: quickResult.isAvailable,
        reason: quickResult.reason,
      });
    }

    return { slots: allSlots };
  }
}
