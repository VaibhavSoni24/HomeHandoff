/**
 * Date helper utilities for dynamic and relative schedule calculations
 */

export function getUpcomingDayOfWeek(targetDayIndex: number, targetHour = 18, targetMinute = 0): Date {
  const now = new Date();
  const currentDayIndex = now.getDay(); // 0 is Sunday, 5 is Friday, 6 is Saturday
  let daysUntil = (targetDayIndex - currentDayIndex + 7) % 7;
  
  // If target day is today and time has passed or within 2 hours, push to next week
  if (daysUntil === 0 && now.getHours() >= targetHour - 2) {
    daysUntil = 7;
  } else if (daysUntil === 0) {
    // If today is target day and hours are still well ahead, keep today or next week
    daysUntil = 7;
  }
  
  const target = new Date(now);
  target.setDate(now.getDate() + daysUntil);
  target.setHours(targetHour, targetMinute, 0, 0);
  return target;
}

export function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
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
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

export function getRelativeTimeLabel(isoString: string): string {
  try {
    const target = new Date(isoString).getTime();
    const now = Date.now();
    const diffHours = Math.round((target - now) / (1000 * 60 * 60));
    
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
