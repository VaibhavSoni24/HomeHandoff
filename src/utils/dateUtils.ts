/**
 * Date helper utilities for dynamic and relative schedule calculations
 */

/**
 * Returns the next valid occurrence of a target weekday (0=Sun, 1=Mon, ..., 6=Sat)
 * at the specified targetHour and targetMinute.
 * 
 * If today is the target day of the week:
 * - If baseDate is strictly before the target time today, returns today at target time.
 * - If baseDate is at or after the target time today, returns the occurrence 7 days later.
 * 
 * @param targetDayIndex Day of the week (0 = Sunday, 5 = Friday, 6 = Saturday)
 * @param targetHour Hour in 24h format (default: 18)
 * @param targetMinute Minute (default: 0)
 * @param baseDate Optional reference date (defaults to current system time)
 */
export function getUpcomingDayOfWeek(
  targetDayIndex: number, 
  targetHour = 18, 
  targetMinute = 0,
  baseDate: Date = new Date()
): Date {
  const currentDayIndex = baseDate.getDay();
  let daysUntil = (targetDayIndex - currentDayIndex + 7) % 7;
  
  if (daysUntil === 0) {
    const targetToday = new Date(baseDate);
    targetToday.setHours(targetHour, targetMinute, 0, 0);
    
    // If the target timestamp today has already arrived or passed, push to next week
    if (baseDate.getTime() >= targetToday.getTime()) {
      daysUntil = 7;
    }
  }
  
  const target = new Date(baseDate);
  target.setDate(baseDate.getDate() + daysUntil);
  target.setHours(targetHour, targetMinute, 0, 0);
  return target;
}

/**
 * Reschedules an existing plan's visit date to a target weekday/time without
 * accidentally pushing it out by an extra week simply because the current time has passed.
 * Maintains continuity of the visit weekend relative to the scheduled plan.
 */
export function getRescheduledDateForPlan(
  currentPlanDateIso: string,
  targetDayIndex: number,
  targetHour = 17,
  targetMinute = 0
): Date {
  const currentPlanDate = new Date(currentPlanDateIso);
  if (isNaN(currentPlanDate.getTime())) {
    return getUpcomingDayOfWeek(targetDayIndex, targetHour, targetMinute);
  }

  const currentPlanDay = currentPlanDate.getDay();
  // Calculate relative day shift from the plan's day to target day
  let dayShift = targetDayIndex - currentPlanDay;
  if (dayShift < 0) {
    dayShift += 7;
  }

  const newTarget = new Date(currentPlanDate);
  newTarget.setDate(currentPlanDate.getDate() + dayShift);
  newTarget.setHours(targetHour, targetMinute, 0, 0);
  return newTarget;
}

import type { CalendarEvent } from '../types/household';

/**
 * Validates strictly whether year, monthIndex (0-11), and day (1-31) represent
 * a real calendar date, rejecting JavaScript date overflow/rollover.
 */
export function isValidCalendarDate(year: number, monthIndex: number, day: number): boolean {
  if (monthIndex < 0 || monthIndex > 11) return false;
  if (day < 1 || day > 31) return false;
  const testDate = new Date(year, monthIndex, day);
  return (
    testDate.getFullYear() === year &&
    testDate.getMonth() === monthIndex &&
    testDate.getDate() === day
  );
}

/**
 * Extracts explicit time from natural language (e.g., "at 5 PM", "5:30pm", "17:00", "5:00 PM").
 */
export function extractExplicitTime(text: string): { hour: number; minute: number } | null {
  if (!text) return null;

  // 12-hour format with am/pm (e.g., "at 5 PM", "5:30pm", "10 AM")
  const time12Match = text.match(/(?:at\s+)?\b(1[0-2]|0?[1-9])(?::([0-5][0-9]))?\s*(am|pm)\b/i);
  if (time12Match) {
    let hour = parseInt(time12Match[1], 10);
    const minute = time12Match[2] ? parseInt(time12Match[2], 10) : 0;
    const meridiem = time12Match[3].toLowerCase();
    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
    return { hour, minute };
  }

  // 24-hour format (e.g., "at 17:00", "17:30")
  const time24Match = text.match(/(?:at\s+)?\b([01]?[0-9]|2[0-3]):([0-5][0-9])\b/i);
  if (time24Match) {
    const hour = parseInt(time24Match[1], 10);
    const minute = parseInt(time24Match[2], 10);
    return { hour, minute };
  }

  return null;
}

const MONTH_NAMES_MAP: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11
};

/**
 * Inspects whether text contains an impossible calendar date specification
 * such as "February 31", "April 31", etc.
 */
export function detectImpossibleDate(text: string, referenceYear = new Date().getFullYear()): { isImpossible: boolean; description?: string } {
  if (!text) return { isImpossible: false };

  // Month-name followed by day
  const monthDayMatch = text.match(/\b(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?\b/i);
  if (monthDayMatch) {
    const monthKey = monthDayMatch[1].toLowerCase();
    const day = parseInt(monthDayMatch[2], 10);
    const year = monthDayMatch[3] ? parseInt(monthDayMatch[3], 10) : referenceYear;
    const monthIndex = MONTH_NAMES_MAP[monthKey];
    if (monthIndex !== undefined && !isValidCalendarDate(year, monthIndex, day)) {
      return {
        isImpossible: true,
        description: `${monthDayMatch[1]} ${day}${monthDayMatch[3] ? `, ${year}` : ''}`
      };
    }
  }

  // Day followed by of + month
  const dayMonthMatch = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)(?:,?\s*(\d{4}))?\b/i);
  if (dayMonthMatch) {
    const day = parseInt(dayMonthMatch[1], 10);
    const monthKey = dayMonthMatch[2].toLowerCase();
    const year = dayMonthMatch[3] ? parseInt(dayMonthMatch[3], 10) : referenceYear;
    const monthIndex = MONTH_NAMES_MAP[monthKey];
    if (monthIndex !== undefined && !isValidCalendarDate(year, monthIndex, day)) {
      return {
        isImpossible: true,
        description: `${day} ${dayMonthMatch[2]}${dayMonthMatch[3] ? ` ${year}` : ''}`
      };
    }
  }

  // ISO format YYYY-MM-DD
  const isoMatch = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const monthIndex = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    if (!isValidCalendarDate(year, monthIndex, day)) {
      return {
        isImpossible: true,
        description: `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`
      };
    }
  }

  return { isImpossible: false };
}

/**
 * Parses explicit ISO or human calendar dates (e.g., "2026-11-15", "Nov 14", "November 14, 2026 at 5 PM")
 * Strictly rejects impossible dates and extracts time components if present.
 */
export function parseExplicitDate(
  text: string, 
  referenceDate: Date = new Date(),
  defaultHour = 17,
  defaultMinute = 0
): Date | null {
  if (!text) return null;

  const parsedTime = extractExplicitTime(text);
  const hour = parsedTime ? parsedTime.hour : defaultHour;
  const minute = parsedTime ? parsedTime.minute : defaultMinute;

  // 1. Check for standard ISO pattern YYYY-MM-DD
  const isoMatch = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    if (!isValidCalendarDate(year, month, day)) {
      return null; // Reject impossible calendar dates strictly
    }
    const d = new Date(year, month, day, hour, minute, 0, 0);
    if (!isNaN(d.getTime())) return d;
  }

  // 2. Check for Month Day pattern like "Nov 14", "November 14", "November 14, 2026"
  const monthDayMatch = text.match(/\b(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?\b/i);
  if (monthDayMatch) {
    const monthKey = monthDayMatch[1].toLowerCase();
    const day = parseInt(monthDayMatch[2], 10);
    const month = MONTH_NAMES_MAP[monthKey];
    const year = monthDayMatch[3] ? parseInt(monthDayMatch[3], 10) : referenceDate.getFullYear();

    if (month !== undefined) {
      if (!isValidCalendarDate(year, month, day)) {
        return null; // Strictly reject impossible dates
      }

      const target = new Date(year, month, day, hour, minute, 0, 0);
      // If no year specified and target is more than 3 months in past, assume next year
      if (!monthDayMatch[3] && target.getTime() < referenceDate.getTime() - 90 * 24 * 60 * 60 * 1000) {
        target.setFullYear(year + 1);
      }
      if (!isNaN(target.getTime())) return target;
    }
  }

  // 3. Check for Day of Month pattern like "14th of November 2026"
  const dayMonthMatch = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)(?:,?\s*(\d{4}))?\b/i);
  if (dayMonthMatch) {
    const day = parseInt(dayMonthMatch[1], 10);
    const monthKey = dayMonthMatch[2].toLowerCase();
    const month = MONTH_NAMES_MAP[monthKey];
    const year = dayMonthMatch[3] ? parseInt(dayMonthMatch[3], 10) : referenceDate.getFullYear();

    if (month !== undefined) {
      if (!isValidCalendarDate(year, month, day)) {
        return null; // Strictly reject impossible dates
      }

      const target = new Date(year, month, day, hour, minute, 0, 0);
      if (!dayMonthMatch[3] && target.getTime() < referenceDate.getTime() - 90 * 24 * 60 * 60 * 1000) {
        target.setFullYear(year + 1);
      }
      if (!isNaN(target.getTime())) return target;
    }
  }

  return null;
}

export interface ParsedTaskDeadlineResult {
  date?: Date;
  isImpossible?: boolean;
  impossibleDescription?: string;
}

/**
 * Parses an explicit task deadline from a natural language string.
 * Supports:
 * - Detecting impossible calendar dates (e.g. Feb 31, April 31)
 * - ISO calendar dates (e.g. 2026-11-14)
 * - Month-day and day-month calendar dates (e.g. Nov 14, November 14, 2026 at 5 PM)
 * - Relative keywords like "tomorrow [at HH:MM]", "today [at HH:MM]"
 * - Weekday names (e.g. "Saturday at 5 PM", "Friday 15:00")
 * 
 * Returns null if the string contains no recognized date expression.
 */
export function parseTaskDeadline(
  text: string,
  referenceDate: Date = new Date(),
  defaultHour = 17,
  defaultMinute = 0
): ParsedTaskDeadlineResult | null {
  if (!text || !text.trim()) return null;
  const trimmed = text.trim();

  // 1. Detect impossible dates
  const impossible = detectImpossibleDate(trimmed, referenceDate.getFullYear());
  if (impossible.isImpossible) {
    return {
      isImpossible: true,
      impossibleDescription: impossible.description
    };
  }

  // 2. Try explicit calendar date (ISO / Month Day / Day Month)
  const explicitDate = parseExplicitDate(trimmed, referenceDate, defaultHour, defaultMinute);
  if (explicitDate) {
    return { date: explicitDate };
  }

  // 3. Check for "tomorrow"
  if (/\btomorrow\b/i.test(trimmed)) {
    const time = extractExplicitTime(trimmed) || { hour: defaultHour, minute: defaultMinute };
    const target = new Date(referenceDate);
    target.setDate(referenceDate.getDate() + 1);
    target.setHours(time.hour, time.minute, 0, 0);
    return { date: target };
  }

  // 4. Check for "today"
  if (/\btoday\b/i.test(trimmed)) {
    const time = extractExplicitTime(trimmed);
    if (time) {
      const target = new Date(referenceDate);
      target.setHours(time.hour, time.minute, 0, 0);
      return { date: target };
    }
  }

  // 5. Check for weekdays (monday - sunday)
  const weekdayMatch = trimmed.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
  if (weekdayMatch) {
    const dayMap: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6
    };
    const targetDay = dayMap[weekdayMatch[1].toLowerCase()];
    const time = extractExplicitTime(trimmed) || { hour: defaultHour, minute: defaultMinute };
    const target = getUpcomingDayOfWeek(targetDay, time.hour, time.minute, referenceDate);
    return { date: target };
  }

  return null;
}

export interface NextUpcomingEventResult {
  event: CalendarEvent;
  isInProgress: boolean;
}

/**
 * Deterministically finds the nearest relevant future or in-progress event.
 * Rejects events that have already ended.
 */
export function findNextUpcomingEvent(
  events: CalendarEvent[],
  referenceDate: Date = new Date()
): NextUpcomingEventResult | null {
  if (!events || events.length === 0) return null;
  const refTime = referenceDate.getTime();

  // Filter events that have not yet ended (end > refTime)
  const activeOrUpcoming = events.filter(e => {
    const endTime = new Date(e.end).getTime();
    return !isNaN(endTime) && endTime > refTime;
  });

  if (activeOrUpcoming.length === 0) {
    return null;
  }

  // Sort by start time ascending
  activeOrUpcoming.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const nearest = activeOrUpcoming[0];
  const startTime = new Date(nearest.start).getTime();
  const endTime = new Date(nearest.end).getTime();
  const isInProgress = startTime <= refTime && endTime > refTime;

  return {
    event: nearest,
    isInProgress
  };
}

export function formatDateTime(isoString?: string | null): string {
  if (!isoString) return 'No due date';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

export function formatDateShort(isoString?: string | null): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

export function formatTimeOnly(isoString?: string | null): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

export function getRelativeTimeLabel(isoString?: string | null, baseNow = Date.now()): string {
  if (!isoString) return '';
  try {
    const target = new Date(isoString).getTime();
    if (isNaN(target)) return '';
    const diffHours = Math.round((target - baseNow) / (1000 * 60 * 60));
    
    if (diffHours < 0) {
      const pastHours = Math.abs(diffHours);
      if (pastHours < 24) return `${pastHours}h ago`;
      return `${Math.round(pastHours / 24)}d ago`;
    }
    if (diffHours < 24) return `in ${diffHours}h`;
    const days = Math.round(diffHours / 24);
    return `in ${days} ${days === 1 ? 'day' : 'days'}`;
  } catch {
    return '';
  }
}

