/**
 * Date utility functions for handling UTC and local timezone conversions
 * All dates are stored in UTC in the database and converted to/from user's local timezone
 */

/**
 * Format a UTC date to dd/mm/YYYY format (displayed in user's local timezone)
 * @param date - Date object or ISO string in UTC
 * @returns Formatted date string in dd/mm/YYYY format
 */
export function formatDateDDMMYYYY(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format a UTC date with time to dd/mm/YYYY HH:mm format (displayed in user's local timezone)
 * @param date - Date object or ISO string in UTC
 * @returns Formatted date string in dd/mm/YYYY HH:mm format
 */
export function formatDateTimeDDMMYYYY(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Convert a date string (YYYY-MM-DD) interpreted as local date to UTC ISO string
 * Used for date filters where user selects a date in their local timezone
 * @param dateString - String in format "YYYY-MM-DD" (interpreted as local date)
 * @returns ISO string in UTC format "YYYY-MM-DDTHH:mm:ss.sssZ" (start of day)
 */
export function localDateToUTCISO(dateString: string): string {
  if (!dateString) {
    return new Date().toISOString();
  }
  // Parse as local date (YYYY-MM-DD is interpreted as local midnight)
  const localDate = new Date(dateString + 'T00:00:00');
  // Convert to UTC ISO string
  return localDate.toISOString();
}

/**
 * Convert a date string (YYYY-MM-DD) interpreted as local date to UTC ISO string (end of day)
 * @param dateString - String in format "YYYY-MM-DD" (interpreted as local date)
 * @returns ISO string in UTC format "YYYY-MM-DDTHH:mm:ss.sssZ" (end of day)
 */
export function localDateToUTCISOEndOfDay(dateString: string): string {
  if (!dateString) {
    return new Date().toISOString();
  }
  // Parse as local date end of day (23:59:59.999)
  const localDate = new Date(dateString + 'T23:59:59.999');
  return localDate.toISOString();
}

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
 * Alias for localToUTC - converts datetime-local to UTC ISO string
 * @param localDateTime - String in format "YYYY-MM-DDTHH:mm" (local time)
 * @returns ISO string in UTC format "YYYY-MM-DDTHH:mm:ss.sssZ"
 */
export function localDateTimeToUTCISO(localDateTime: string): string {
  return localToUTC(localDateTime);
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
 * @deprecated Use localDateToUTCISO instead. This function returns a Date object, but APIs should receive ISO strings.
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
 * @deprecated Use localDateToUTCISOEndOfDay instead. This function returns a Date object, but APIs should receive ISO strings.
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
