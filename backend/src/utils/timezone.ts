/**
 * Simple timezone conversion utility using date-fns-tz
 * Converts a local date/time in a specific timezone to UTC
 * 
 * Example: 11 AM IST -> 5:30 AM UTC
 */

import { fromZonedTime } from 'date-fns-tz';

/**
 * Convert local date/time to UTC
 * @param dateString - Date string in YYYY-MM-DD format
 * @param timeString - Time string in HH:MM format
 * @param timezone - IANA timezone string (e.g., "Asia/Kolkata", "America/New_York")
 * @returns Date object in UTC
 */
export function convertLocalToUTC(
  dateString: string,
  timeString: string,
  timezone: string
): Date {
  // Parse the input
  const [year, month, day] = dateString.split('-').map(Number);
  const [hour, minute] = timeString.split(':').map(Number);

  // Create a date object with the local time components
  // fromZonedTime interprets this date as if it's in the given timezone and returns UTC
  const localDate = new Date(year, month - 1, day, hour, minute, 0);

  // Convert from the zoned time to UTC
  return fromZonedTime(localDate, timezone);
}

