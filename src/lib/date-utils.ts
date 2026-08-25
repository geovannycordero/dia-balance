/**
 * Date utility functions for handling UTC and local timezone conversions
 * All dates are stored in UTC in the database and converted to/from user's local timezone
 */

/**
 * Format a UTC date to dd/mm/YYYY format (displayed in user's local timezone)
 * @param date - Date object or ISO string in UTC
 * @returns Formatted date string in dd/mm/YYYY format
 */
const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function formatDateDDMMYYYY(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateFormatter.format(dateObj);
}

/**
 * Format a UTC date with time to dd/mm/YYYY HH:mm format (displayed in user's local timezone)
 * @param date - Date object or ISO string in UTC
 * @returns Formatted date string in dd/mm/YYYY HH:mm format
 */
const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function formatDateTimeDDMMYYYY(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  // en-GB renders this as "dd/mm/yyyy, HH:mm" — normalize the comma+whitespace to a single space
  return dateTimeFormatter.format(dateObj).replace(/,\s*/, ' ');
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
 * Get current local time in datetime-local format
 * @returns String in format "YYYY-MM-DDTHH:mm" (local time)
 */
export function getCurrentLocalDateTime(): string {
  const now = new Date();
  return utcToLocal(now);
}
