/**
 * Formats coin values for display
 */

/**
 * Formats Webya Coins value for display - shows actual value with up to 2 decimal places
 * No conversion is done - displays the raw value as stored
 * @param coins - The Webya Coins value to format
 * @returns Formatted string with up to 2 decimal places
 */
export function formatCoins(coins: number | string | null | undefined): string {
  // Handle null, undefined, or empty string
  if (coins === null || coins === undefined || coins === '') {
    return '0';
  }

  // Convert to number if it's a string
  const numCoins = typeof coins === 'string' ? parseFloat(coins) : coins;

  // Check if the conversion resulted in a valid number
  if (isNaN(numCoins)) {
    return '0';
  }

  // Display with up to 2 decimal places, removing trailing zeros
  if (Number.isInteger(numCoins)) {
    return numCoins.toString();
  }
  
  // Round to 2 decimal places and remove trailing zeros
  const formatted = numCoins.toFixed(2);
  return parseFloat(formatted).toString();
}

/**
 * @deprecated Use formatCoins instead - there is no Coins conversion
 * This function now just calls formatCoins for backward compatibility
 */
export function formatMaya(coins: number | string | null | undefined): string {
  return formatCoins(coins);
}

/**
 * Formats a coin value to show full precision with smart truncation
 * For very large numbers, shows 4 or 8 decimal places followed by "..."
 * @param coins - The coin value to format
 * @returns Formatted string with full precision
 */
export function formatCoinsFull(coins: number | string | null | undefined): string {
  // Handle null, undefined, or empty string
  if (coins === null || coins === undefined || coins === '') {
    return '0';
  }
  
  // Convert to number if it's a string
  const numCoins = typeof coins === 'string' ? parseFloat(coins) : coins;
  
  // Check if the conversion resulted in a valid number
  if (isNaN(numCoins)) {
    return '0';
  }
  
  const str = numCoins.toString();
  
  // If it's a whole number, just return it
  if (Number.isInteger(numCoins)) {
    return str;
  }
  
  // Split by decimal point
  const [integerPart, decimalPart] = str.split('.');
  
  // If decimal part is 16 characters or less, show it all
  if (decimalPart && decimalPart.length <= 16) {
    return str;
  }
  
  // For very long decimal parts, truncate intelligently
  if (decimalPart && decimalPart.length > 16) {
    // If the number is very large (integer part > 6 digits), show 4 decimal places
    if (integerPart.length > 6) {
      return `${integerPart}.${decimalPart.substring(0, 4)}...`;
    }
    // Otherwise show 8 decimal places
    return `${integerPart}.${decimalPart.substring(0, 8)}...`;
  }
  
  return str;
}
