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

/**
 * Parses explicit ISO or human calendar dates (e.g., "2026-11-15", "Nov 15")
 * to distinguish explicit calendar dates from generic weekday requests.
 */
export function parseExplicitDate(text: string): Date | null {
  if (!text) return null;

  // 1. Check for standard ISO pattern YYYY-MM-DD
  const isoMatch = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const d = new Date(year, month, day, 18, 0, 0, 0);
    if (!isNaN(d.getTime())) return d;
  }

  // 2. Check for Month Day pattern like "Nov 14", "November 14", "Oct 24"
  const monthNames: Record<string, number> = {
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

  const monthDayMatch = text.match(/\b(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i);
  if (monthDayMatch) {
    const monthKey = monthDayMatch[1].toLowerCase();
    const day = parseInt(monthDayMatch[2], 10);
    const month = monthNames[monthKey];
    if (month !== undefined) {
      const now = new Date();
      let year = now.getFullYear();
      const target = new Date(year, month, day, 18, 0, 0, 0);
      // If the date in current year is more than 3 months in the past, assume next year
      if (target.getTime() < now.getTime() - 90 * 24 * 60 * 60 * 1000) {
        target.setFullYear(year + 1);
      }
      if (!isNaN(target.getTime())) return target;
    }
  }

  return null;
}

export function formatDateTime(isoString: string): string {
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

export function formatDateShort(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoString;
  }
}

export function formatTimeOnly(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

export function getRelativeTimeLabel(isoString: string, baseNow = Date.now()): string {
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
