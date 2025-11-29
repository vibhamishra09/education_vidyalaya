/**
 * Utility functions for Google Meet link validation and management
 */

/**
 * Validate if a string is a valid Google Meet link
 */
export function isValidGoogleMeetLink(link: string): boolean {
  if (!link || typeof link !== 'string') {
    return false;
  }

  // Check for Google Meet links (both old and new formats)
  const meetRegex =
    /^https:\/\/meet\.google\.com\/([a-z0-9]{3}-[a-z0-9]{4}-[a-z0-9]{3}|[a-z0-9]{10,})$/i;
  return meetRegex.test(link.trim());
}

/**
 * Normalize a Google Meet link (remove extra spaces, ensure proper format)
 */
export function normalizeGoogleMeetLink(link: string): string {
  if (!link) return '';

  const trimmed = link.trim();

  // If it's already a valid Google Meet link, return as is
  if (isValidGoogleMeetLink(trimmed)) {
    return trimmed;
  }

  // If it's just a meeting code, convert to full URL
  const codeMatch = trimmed.match(
    /^([a-z0-9]{3}-[a-z0-9]{4}-[a-z0-9]{3}|[a-z0-9]{10,})$/i,
  );
  if (codeMatch) {
    return `https://meet.google.com/${codeMatch[1]}`;
  }

  return trimmed;
}

/**
 * Extract meeting code from a Google Meet link
 */
export function extractMeetingCode(link: string): string | null {
  if (!isValidGoogleMeetLink(link)) {
    return null;
  }

  const match = link.match(/meet\.google\.com\/([a-z0-9-]+)/i);
  return match ? match[1] : null;
}

/**
 * Generate a placeholder message for users
 */
export function getMeetLinkPlaceholder(): string {
  return 'https://meet.google.com/your-meeting-code';
}

/**
 * Check if a link needs to be provided by the user
 */
export function isUserProvidedLink(link: string): boolean {
  return link === getMeetLinkPlaceholder() || !link;
}
