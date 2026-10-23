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
