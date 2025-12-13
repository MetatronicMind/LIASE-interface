/**
 * Date and Time Formatting Utility with Timezone Support
 * Supports multiple date formats and timezone handling
 */

export type DateFormat = 'DD-MMM-YYYY' | 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' | 'DD-MM-YYYY';
export type TimeFormat = '24h' | '12h';
export type TimezoneFormat = 'UTC' | 'Local' | 'Custom';

export interface DateTimeSettings {
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  timezone: string; // e.g., 'GMT+05:30', 'America/New_York'
  showTimezone: boolean;
  showSeconds: boolean;
}

// Default settings
const DEFAULT_SETTINGS: DateTimeSettings = {
  dateFormat: 'DD-MMM-YYYY',
  timeFormat: '24h',
  timezone: 'Local',
  showTimezone: true,
  showSeconds: false,
};

// Get stored settings or return defaults
export function getDateTimeSettings(): DateTimeSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  
  try {
    const stored = localStorage.getItem('dateTimeSettings');
    return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// Save settings
export function saveDateTimeSettings(settings: DateTimeSettings): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('dateTimeSettings', JSON.stringify(settings));
}

// Helper function to pad numbers
function pad(num: number): string {
  return num.toString().padStart(2, '0');
}

// Get month abbreviation
function getMonthAbbr(month: number): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[month];
}

// Convert date to specified timezone
function convertToTimezone(date: Date, timezone: string): Date {
  if (timezone === 'Local') {
    return date;
  }
  
  // Try to parse custom timezone format (e.g., GMT+05:30, GMT-08:00)
  const gmtMatch = timezone.match(/GMT([+-])(\d{2}):?(\d{2})/);
  if (gmtMatch) {
    const sign = gmtMatch[1] === '+' ? 1 : -1;
    const hours = parseInt(gmtMatch[2]);
    const minutes = parseInt(gmtMatch[3]);
    const offsetMs = sign * (hours * 60 + minutes) * 60 * 1000;
    const utcTime = date.getTime() + date.getTimezoneOffset() * 60 * 1000;
    return new Date(utcTime + offsetMs);
  }
  
  // Try to use standard timezone format via Intl API
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    
    const parts = formatter.formatToParts(date);
    const dateObj = {
      year: 0,
      month: 0,
      day: 0,
      hour: 0,
      minute: 0,
      second: 0,
    };
    
    parts.forEach((part) => {
      if (part.type === 'year') dateObj.year = parseInt(part.value);
      if (part.type === 'month') dateObj.month = parseInt(part.value) - 1;
      if (part.type === 'day') dateObj.day = parseInt(part.value);
      if (part.type === 'hour') dateObj.hour = parseInt(part.value);
      if (part.type === 'minute') dateObj.minute = parseInt(part.value);
      if (part.type === 'second') dateObj.second = parseInt(part.value);
    });
    
    return new Date(dateObj.year, dateObj.month, dateObj.day, dateObj.hour, dateObj.minute, dateObj.second);
  } catch {
    return date;
  }
}

// Get timezone abbreviation
function getTimezoneAbbr(timezone: string): string {
  if (timezone === 'Local') {
    return new Date().toLocaleString('en-US', { timeZoneName: 'short' }).split(' ').pop() || 'Local';
  }
  
  const gmtMatch = timezone.match(/GMT([+-])(\d{2}):?(\d{2})/);
  if (gmtMatch) {
    return timezone;
  }
  
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    });
    return formatter.format(new Date()).split(' ').pop() || timezone;
  } catch {
    return timezone;
  }
}

// Format date only
export function formatDate(date: Date | string | null, settings?: DateTimeSettings): string {
  if (!date) return '-';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '-';
  
  const config = settings || getDateTimeSettings();
  const convertedDate = convertToTimezone(dateObj, config.timezone);
  
  const year = convertedDate.getFullYear();
  const month = convertedDate.getMonth();
  const day = convertedDate.getDate();
  
  switch (config.dateFormat) {
    case 'DD-MMM-YYYY':
      return `${pad(day)}-${getMonthAbbr(month)}-${year}`;
    case 'DD/MM/YYYY':
      return `${pad(day)}/${pad(month + 1)}/${year}`;
    case 'MM/DD/YYYY':
      return `${pad(month + 1)}/${pad(day)}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${pad(month + 1)}-${pad(day)}`;
    case 'DD-MM-YYYY':
      return `${pad(day)}-${pad(month + 1)}-${year}`;
    default:
      return `${pad(day)}-${getMonthAbbr(month)}-${year}`;
  }
}

// Format time only
export function formatTime(date: Date | string | null, settings?: DateTimeSettings): string {
  if (!date) return '-';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '-';
  
  const config = settings || getDateTimeSettings();
  const convertedDate = convertToTimezone(dateObj, config.timezone);
  
  const hours = convertedDate.getHours();
  const minutes = convertedDate.getMinutes();
  const seconds = convertedDate.getSeconds();
  
  let timeStr: string;
  
  if (config.timeFormat === '12h') {
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    timeStr = `${pad(hours12)}:${pad(minutes)}${config.showSeconds ? ':' + pad(seconds) : ''} ${period}`;
  } else {
    timeStr = `${pad(hours)}:${pad(minutes)}${config.showSeconds ? ':' + pad(seconds) : ''}`;
  }
  
  if (config.showTimezone && config.timezone !== 'Local') {
    timeStr += ` ${getTimezoneAbbr(config.timezone)}`;
  }
  
  return timeStr;
}

// Format complete date and time
export function formatDateTime(date: Date | string | null, settings?: DateTimeSettings): string {
  if (!date) return '-';
  
  const config = settings || getDateTimeSettings();
  const dateStr = formatDate(date, config);
  const timeStr = formatTime(date, config);
  
  return `${dateStr} ${timeStr}`;
}

// Format date for display in tables (compact format)
export function formatDateCompact(date: Date | string | null, settings?: DateTimeSettings): string {
  if (!date) return '-';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '-';
  
  const config = settings || getDateTimeSettings();
  return formatDate(dateObj, config);
}

// Format timestamp (date + time) for logs and tables
export function formatTimestamp(date: Date | string | null, settings?: DateTimeSettings): string {
  if (!date) return '-';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '-';
  
  const config = settings || getDateTimeSettings();
  return formatDateTime(dateObj, config);
}

// Get relative time (e.g., "2 hours ago")
export function formatRelativeTime(date: Date | string | null): string {
  if (!date) return '-';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '-';
  
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return formatDate(dateObj);
}

// Get all available timezones
export function getAvailableTimezones(): string[] {
  const timezones = [
    'Local',
    'UTC',
    'GMT+00:00',
    'GMT+05:30', // India Standard Time
    'GMT+08:00', // Singapore, China
    'GMT+09:00', // Japan
    'GMT+10:00', // Australia
    'GMT-05:00', // Eastern Time
    'GMT-06:00', // Central Time
    'GMT-07:00', // Mountain Time
    'GMT-08:00', // Pacific Time
  ];
  
  // Add IANA timezone names if supported
  const ianaTimezones = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Kolkata',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Singapore',
    'Australia/Sydney',
  ];
  
  try {
    Intl.DateTimeFormat().resolvedOptions();
    return [...timezones, ...ianaTimezones];
  } catch {
    return timezones;
  }
}

// Format date for input field (returns ISO string)
export function formatDateForInput(date: Date | string | null): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '';
  
  const year = dateObj.getFullYear();
  const month = pad(dateObj.getMonth() + 1);
  const day = pad(dateObj.getDate());
  
  return `${year}-${month}-${day}`;
}
