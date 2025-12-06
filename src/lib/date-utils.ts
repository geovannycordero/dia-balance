/**
 * Date utility functions for handling UTC and local timezone conversions
 * All dates are stored in UTC in the database and converted to/from user's local timezone
 */

/**
 * Convert a datetime-local string (from HTML input) to UTC ISO string
 * datetime-local inputs are in the user's local timezone without timezone info
 * @param localDateTime - String in format "YYYY-MM-DDTHH:mm" (local time)
 * @returns ISO string in UTC format "YYYY-MM-DDTHH:mm:ss.sssZ"
 */
export function localToUTC(localDateTime: string): string {
  if (!localDateTime) {
    return new Date().toISOString();
  }
  // Create a date object treating the input as local time
  // new Date() interprets "YYYY-MM-DDTHH:mm" as local time
  const localDate = new Date(localDateTime);
  // Convert to UTC ISO string
  return localDate.toISOString();
}

/**
 * Convert a UTC date to datetime-local format for HTML input elements
 * @param utcDate - Date object or ISO string in UTC
 * @returns String in format "YYYY-MM-DDTHH:mm" (local time)
 */
export function utcToLocal(utcDate: Date | string): string {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;

  // Get local time components
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Convert a date string (YYYY-MM-DD) interpreted as local date to UTC Date
 * Used for date filters where user selects a date in their local timezone
 * @param dateString - String in format "YYYY-MM-DD" (interpreted as local date)
 * @returns Date object representing start of day in UTC
 */
export function dateStringToUTC(dateString: string): Date {
  if (!dateString) {
    return new Date();
  }
  // Parse as local date (YYYY-MM-DD is interpreted as local midnight)
  const localDate = new Date(dateString + 'T00:00:00');
  // Return as Date object (will be stored as UTC in database)
  return localDate;
}

/**
 * Convert a date string (YYYY-MM-DD) to UTC Date representing end of day
 * @param dateString - String in format "YYYY-MM-DD" (interpreted as local date)
 * @returns Date object representing end of day in UTC
 */
export function dateStringToUTCEndOfDay(dateString: string): Date {
  if (!dateString) {
    return new Date();
  }
  // Parse as local date end of day (23:59:59.999)
  const localDate = new Date(dateString + 'T23:59:59.999');
  return localDate;
}

/**
 * Format a UTC date for display in user's local timezone
 * @param date - Date object or ISO string in UTC
 * @param options - Intl.DateTimeFormatOptions for formatting
 * @returns Formatted date string in user's local timezone
 */
export function formatDateForDisplay(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString(undefined, options);
}

/**
 * Format a UTC date as date-only string in user's local timezone
 * @param date - Date object or ISO string in UTC
 * @returns Date string in format based on user's locale
 */
export function formatDateOnly(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString();
}

/**
 * Get current local time in datetime-local format
 * @returns String in format "YYYY-MM-DDTHH:mm" (local time)
 */
export function getCurrentLocalDateTime(): string {
  const now = new Date();
  return utcToLocal(now);
}
