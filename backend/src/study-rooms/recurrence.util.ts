import { convertLocalToUTC } from '../utils/timezone';
import { StudyRoomRecurrenceDto, StudyRoomRecurrenceMode } from './dto/study-room.dto';

const MS_IN_DAY = 24 * 60 * 60 * 1000;
const MAX_HORIZON_DAYS = 365;
const MAX_OCCURRENCES = 366;

export type StudyRoomOccurrence = {
  utcDate: Date;
  localDate: string;
  occurrenceIndex: number;
};

function parseDateOnly(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) {
    throw new Error(`Invalid date format: ${dateString}`);
  }
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateOnly(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_IN_DAY);
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / MS_IN_DAY);
}

function buildRecurringDates(
  startDate: string,
  recurrence: StudyRoomRecurrenceDto,
): string[] {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(recurrence.repeatUntil);
  const maxEnd = addDays(start, MAX_HORIZON_DAYS);

  if (end < start) {
    throw new Error('repeatUntil must be on or after start date');
  }
  if (end > maxEnd) {
    throw new Error('Recurrence cannot exceed one year from the start date');
  }

  const interval = recurrence.interval ?? 1;
  const dateSet = new Set<string>();

  if (recurrence.mode === StudyRoomRecurrenceMode.CUSTOM_DATES) {
    if (!recurrence.customDates?.length) {
      throw new Error('customDates is required for CUSTOM_DATES recurrence mode');
    }

    const allCustomDates = [startDate, ...recurrence.customDates];
    for (const localDate of allCustomDates) {
      const current = parseDateOnly(localDate);
      if (current < start || current > end) {
        continue;
      }
      dateSet.add(formatDateOnly(current));
    }
  } else {
    const weekdays =
      recurrence.mode === StudyRoomRecurrenceMode.WEEKLY
        ? new Set(recurrence.weekdays ?? [])
        : null;

    if (recurrence.mode === StudyRoomRecurrenceMode.WEEKLY && (!weekdays || weekdays.size === 0)) {
      throw new Error('weekdays is required for WEEKLY recurrence mode');
    }

    for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
      const diffDays = daysBetween(start, cursor);

      if (recurrence.mode === StudyRoomRecurrenceMode.DAILY) {
        if (diffDays % interval === 0) {
          dateSet.add(formatDateOnly(cursor));
        }
        continue;
      }

      const weekIndex = Math.floor(diffDays / 7);
      if (weekIndex % interval === 0 && weekdays?.has(cursor.getUTCDay())) {
        dateSet.add(formatDateOnly(cursor));
      }
    }
  }

  const sortedDates = Array.from(dateSet).sort((a, b) => a.localeCompare(b));
  if (sortedDates.length === 0) {
    throw new Error('Recurrence configuration produced no valid dates');
  }
  if (sortedDates.length > MAX_OCCURRENCES) {
    throw new Error('Too many occurrences. Please shorten the date range.');
  }

  return sortedDates;
}

export function buildStudyRoomOccurrences(params: {
  startDate: string;
  time: string;
  timezone: string;
  recurrence?: StudyRoomRecurrenceDto;
}): StudyRoomOccurrence[] {
  const { startDate, time, timezone, recurrence } = params;
  const localDates = recurrence ? buildRecurringDates(startDate, recurrence) : [startDate];

  return localDates.map((localDate, index) => ({
    utcDate: convertLocalToUTC(localDate, time, timezone),
    localDate,
    occurrenceIndex: index,
  }));
}
