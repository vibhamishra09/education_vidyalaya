/**
 * Date and Time Utilities for Timezone Handling
 *
 * All dates are stored in UTC in the database.
 * These utilities help convert between UTC and user's local timezone.
 */

/**
 * Get the user's current timezone
 * @returns Timezone string (e.g., "America/New_York", "Asia/Kolkata")
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Get the timezone abbreviation (e.g., "EST", "IST", "PST")
 * @param timezone - IANA timezone string (optional, defaults to user's timezone)
 * @param date - Date to get abbreviation for (optional, defaults to now)
 * @returns Timezone abbreviation
 */
export function getTimezoneAbbreviation(timezone?: string, date: Date = new Date()): string {
  const tz = timezone || getUserTimezone();

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    timeZoneName: 'short',
  });

  const parts = formatter.formatToParts(date);
  const timeZonePart = parts.find(part => part.type === 'timeZoneName');

  return timeZonePart?.value || tz;
}

/**
 * Convert UTC date to user's local timezone and format for display
 * @param utcDate - Date object or ISO string in UTC
 * @param options - Formatting options
 * @returns Formatted date string in user's timezone
 */
export function formatDateInLocalTimezone(
  utcDate: Date | string,
  options: {
    dateStyle?: 'full' | 'long' | 'medium' | 'short';
    timeStyle?: 'full' | 'long' | 'medium' | 'short';
    showTimezone?: boolean;
  } = {}
): string {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  const { dateStyle = 'medium', timeStyle = 'short', showTimezone = true } = options;

  const userTz = getUserTimezone();

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: userTz,
    dateStyle,
    timeStyle,
  });

  const formatted = formatter.format(date);

  if (showTimezone) {
    const tzAbbr = getTimezoneAbbreviation(userTz, date);
    return `${formatted} ${tzAbbr}`;
  }

  return formatted;
}

/**
 * Format date for display with custom format
 * @param utcDate - Date object or ISO string in UTC
 * @param format - 'date' | 'time' | 'datetime' | 'relative'
 * @returns Formatted string
 */
export function formatDate(
  utcDate: Date | string,
  format: 'date' | 'time' | 'datetime' | 'relative' = 'datetime'
): string {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  const userTz = getUserTimezone();
  const tzAbbr = getTimezoneAbbreviation(userTz, date);

  switch (format) {
    case 'date':
      return new Intl.DateTimeFormat('en-US', {
        timeZone: userTz,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(date);

    case 'time':
      return new Intl.DateTimeFormat('en-US', {
        timeZone: userTz,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(date) + ` ${tzAbbr}`;

    case 'datetime':
      return formatDateInLocalTimezone(date, {
        dateStyle: 'medium',
        timeStyle: 'short',
        showTimezone: true
      });

    case 'relative':
      return getRelativeTimeString(date);

    default:
      return date.toLocaleString('en-US', { timeZone: userTz });
  }
}

/**
 * Get relative time string (e.g., "Today at 2:00 PM", "Tomorrow at 3:00 PM")
 * @param utcDate - Date object or ISO string in UTC
 * @returns Relative time string
 */
export function getRelativeTimeString(utcDate: Date | string): string {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  const userTz = getUserTimezone();
  const tzAbbr = getTimezoneAbbreviation(userTz, date);

  const now = new Date();
  const today = new Date(now.toLocaleString('en-US', { timeZone: userTz }));
  const targetDate = new Date(date.toLocaleString('en-US', { timeZone: userTz }));

  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: userTz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const timeString = timeFormatter.format(date);

  if (diffDays === 0) {
    return `Today at ${timeString} ${tzAbbr}`;
  } else if (diffDays === 1) {
    return `Tomorrow at ${timeString} ${tzAbbr}`;
  } else if (diffDays === -1) {
    return `Yesterday at ${timeString} ${tzAbbr}`;
  } else if (diffDays > 1 && diffDays <= 7) {
    const dayName = new Intl.DateTimeFormat('en-US', {
      timeZone: userTz,
      weekday: 'long',
    }).format(date);
    return `${dayName} at ${timeString} ${tzAbbr}`;
  } else {
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: userTz,
      month: 'short',
      day: 'numeric',
    });
    return `${dateFormatter.format(date)} at ${timeString} ${tzAbbr}`;
  }
}

/**
 * Convert local date/time to UTC for backend submission
 * This is used when user selects a date/time in a form
 * @param dateString - Date string (YYYY-MM-DD)
 * @param timeString - Time string (HH:MM)
 * @param timezone - User's timezone (optional, defaults to browser timezone)
 * @returns ISO string in UTC
 */
export function convertLocalToUTC(
  dateString: string,
  timeString: string,
  timezone?: string
): string {
  const tz = timezone || getUserTimezone();

  // Parse the input
  const [year, month, day] = dateString.split('-').map(Number);
  const [hour, minute] = timeString.split(':').map(Number);

  // Create a date string that represents the local time
  const localDateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;

  // Create a date object and format it in the user's timezone
  // Then parse it back to get the UTC equivalent
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date(localDateString));

  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0';

  // Build UTC date
  const utcYear = parseInt(getPart('year'));
  const utcMonth = parseInt(getPart('month'));
  const utcDay = parseInt(getPart('day'));
  const utcHour = parseInt(getPart('hour'));
  const utcMinute = parseInt(getPart('minute'));

  const utcDate = new Date(Date.UTC(utcYear, utcMonth - 1, utcDay, utcHour, utcMinute, 0));

  return utcDate.toISOString();
}

/**
 * Get days until a future date
 * @param utcDate - Date object or ISO string in UTC
 * @returns Number of days (can be negative for past dates)
 */
export function getDaysUntil(utcDate: Date | string): number {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  const userTz = getUserTimezone();

  const now = new Date(new Date().toLocaleString('en-US', { timeZone: userTz }));
  const target = new Date(date.toLocaleString('en-US', { timeZone: userTz }));

  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Check if a date is today in user's timezone
 * @param utcDate - Date object or ISO string in UTC
 * @returns True if date is today
 */
export function isToday(utcDate: Date | string): boolean {
  return getDaysUntil(utcDate) === 0;
}

/**
 * Check if a date is tomorrow in user's timezone
 * @param utcDate - Date object or ISO string in UTC
 * @returns True if date is tomorrow
 */
export function isTomorrow(utcDate: Date | string): boolean {
  return getDaysUntil(utcDate) === 1;
}
