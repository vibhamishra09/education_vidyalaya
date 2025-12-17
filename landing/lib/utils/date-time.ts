/**
 * Date and Time Utilities for Timezone Handling
 * Simplified for static build
 */

/**
 * Get relative time string (e.g., "Today at 2:00 PM", "Tomorrow at 3:00 PM")
 * @param utcDate - Date object or ISO string in UTC
 * @returns Relative time string
 */
export function getRelativeTimeString(utcDate: Date | string): string {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
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

  const tzAbbr = new Intl.DateTimeFormat('en-US', {
    timeZone: userTz,
    timeZoneName: 'short',
  }).formatToParts(date).find(part => part.type === 'timeZoneName')?.value || '';

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
