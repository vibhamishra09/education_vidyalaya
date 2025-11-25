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
   * Get all availability settings for a user
   */
  async getUserAvailability(userId: string) {
    const availability = await this.prisma.userAvailability.findMany({
      where: { userId },
      orderBy: { dayOfWeek: 'asc' },
    });

    return { availability };
  }

  /**
   * Set or update availability for a specific day
   */
  async setDayAvailability(
    userId: string,
    data: UserAvailabilityDto,
  ) {
    // Validate that endTime is after startTime
    if (data.startTime >= data.endTime) {
      throw new BadRequestException('End time must be after start time');
    }

    // Upsert (create or update) availability for the day
    const availability = await this.prisma.userAvailability.upsert({
      where: {
        userId_dayOfWeek: {
          userId,
          dayOfWeek: data.dayOfWeek,
        },
      },
      create: {
        userId,
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
    userId: string,
    data: SetAvailabilityDto,
  ) {
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
              userId,
              dayOfWeek: avail.dayOfWeek,
            },
          },
          create: {
            userId,
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
    userId: string,
    availabilityId: string,
    data: UpdateAvailabilityDto,
  ) {
    // Check if availability exists and belongs to user
    const existing = await this.prisma.userAvailability.findUnique({
      where: { id: availabilityId },
    });

    if (!existing) {
      throw new NotFoundException('Availability setting not found');
    }

    if (existing.userId !== userId) {
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
    // Check if availability exists and belongs to user
    const existing = await this.prisma.userAvailability.findUnique({
      where: { id: availabilityId },
    });

    if (!existing) {
      throw new NotFoundException('Availability setting not found');
    }

    if (existing.userId !== userId) {
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
   */
  async getBlockedSlots(userId: string) {
    const blockedSlots = await this.prisma.blockedTimeSlot.findMany({
      where: { userId },
      orderBy: { startTime: 'asc' },
    });

    return { blockedSlots };
  }

  /**
   * Create a blocked time slot
   */
  async createBlockedSlot(userId: string, data: CreateBlockedSlotDto) {
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
        userId,
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
    // Check if blocked slot exists and belongs to user
    const existing = await this.prisma.blockedTimeSlot.findUnique({
      where: { id: blockedSlotId },
    });

    if (!existing) {
      throw new NotFoundException('Blocked time slot not found');
    }

    if (existing.userId !== userId) {
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
    const user = await this.prisma.user.update({
      where: { id: userId },
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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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
   * 1. User's weekly availability
   * 2. Blocked time slots
   * 3. Existing session conflicts (PENDING or UPCOMING)
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
    const endTime = new Date(startTime.getTime() + duration * 60000);

    // Get user's preferences
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        bufferTime: true,
        minAdvanceTime: true,
        maxFutureBooking: true,
      },
    });

    if (!user) {
      return { isAvailable: false, reason: 'User not found' };
    }

    // Check 1: Minimum advance time
    const now = new Date();
    const minBookingTime = new Date(
      now.getTime() + (user.minAdvanceTime || 120) * 60000,
    );
    if (startTime < minBookingTime) {
      return {
        isAvailable: false,
        reason: `Booking must be at least ${user.minAdvanceTime || 120} minutes in advance`,
      };
    }

    // Check 2: Maximum future booking
    const maxBookingTime = new Date(
      now.getTime() + (user.maxFutureBooking || 30) * 24 * 60 * 60000,
    );
    if (startTime > maxBookingTime) {
      return {
        isAvailable: false,
        reason: `Cannot book more than ${user.maxFutureBooking || 30} days in advance`,
      };
    }

    // Check 3: Weekly availability
    const dayOfWeek = startTime.getDay(); // 0=Sunday, 6=Saturday
    const timeStr = `${startTime.getUTCHours().toString().padStart(2, '0')}:${startTime.getUTCMinutes().toString().padStart(2, '0')}`;
    const endTimeStr = `${endTime.getUTCHours().toString().padStart(2, '0')}:${endTime.getUTCMinutes().toString().padStart(2, '0')}`;

    const availability = await this.prisma.userAvailability.findUnique({
      where: {
        userId_dayOfWeek: {
          userId,
          dayOfWeek,
        },
      },
    });

    if (!availability || !availability.isActive) {
      return {
        isAvailable: false,
        reason: 'User is not available on this day of the week',
      };
    }

    // Check if requested time falls within available hours
    if (timeStr < availability.startTime || endTimeStr > availability.endTime) {
      return {
        isAvailable: false,
        reason: `User is only available from ${availability.startTime} to ${availability.endTime} on this day`,
      };
    }

    // Check 4: Blocked time slots
    const blockedSlots = await this.prisma.blockedTimeSlot.findMany({
      where: {
        userId,
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

    // Check 5: Existing session conflicts (with buffer time)
    const bufferMs = (user.bufferTime || 15) * 60000;
    const startWithBuffer = new Date(startTime.getTime() - bufferMs);
    const endWithBuffer = new Date(endTime.getTime() + bufferMs);

    const conflictingSessions = await this.prisma.peerSession.findMany({
      where: {
        OR: [
          { requestedById: userId },
          { requestedToId: userId },
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
   */
  async getAvailableSlotsForDate(
    userId: string,
    date: string,
    duration: number = 60,
    slotInterval: number = 30, // Generate slots every 30 minutes
  ) {
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();

    // Get user's availability for this day
    const availability = await this.prisma.userAvailability.findUnique({
      where: {
        userId_dayOfWeek: {
          userId,
          dayOfWeek,
        },
      },
    });

    if (!availability || !availability.isActive) {
      return { availableSlots: [] };
    }

    // Parse start and end times
    const [startHour, startMinute] = availability.startTime.split(':').map(Number);
    const [endHour, endMinute] = availability.endTime.split(':').map(Number);

    const slots: { startTime: Date; endTime: Date; isAvailable: boolean }[] = [];

    // Generate all possible slots for the day
    let currentTime = new Date(targetDate);
    currentTime.setHours(startHour, startMinute, 0, 0);

    const dayEnd = new Date(targetDate);
    dayEnd.setHours(endHour, endMinute, 0, 0);

    while (currentTime.getTime() + duration * 60000 <= dayEnd.getTime()) {
      const slotStart = new Date(currentTime);
      const slotEnd = new Date(currentTime.getTime() + duration * 60000);

      // Check if this slot is available
      const availabilityCheck = await this.checkTimeSlotAvailability(
        userId,
        slotStart,
        duration,
      );

      slots.push({
        startTime: slotStart,
        endTime: slotEnd,
        isAvailable: availabilityCheck.isAvailable,
      });

      // Move to next slot
      currentTime = new Date(currentTime.getTime() + slotInterval * 60000);
    }

    return { availableSlots: slots };
  }
}
