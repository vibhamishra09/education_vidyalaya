/**
 * Utility functions for API calls
 */

/**
 * Removes undefined values from an object to prevent axios from creating malformed query parameters
 * @param obj - The object to clean
 * @returns Cleaned object with no undefined values
 */
export function cleanQueryParams<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const cleaned: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      // Handle arrays specially - ensure they remain as arrays
      if (Array.isArray(value)) {
        cleaned[key] = value;
      } else {
        cleaned[key] = value;
      }
    }
  }
  
  return cleaned as Partial<T>;
}

/**
 * Safely constructs query parameters for API calls
 * @param params - The parameters object
 * @returns Cleaned parameters object
 */
export function buildQueryParams<T extends Record<string, unknown>>(params: T): Partial<T> {
  return cleanQueryParams(params);
}
