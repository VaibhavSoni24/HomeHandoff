import { describe, it, expect } from 'vitest';
import { getUpcomingDayOfWeek, formatDateTime, formatTimeOnly, formatDateShort } from '../utils/dateUtils';

describe('dateUtils: getUpcomingDayOfWeek & formatting', () => {
  it('returns today when target is today and current time is before target time', () => {
    // Friday at 10:00 AM
    const fridayMorning = new Date(2026, 9, 23, 10, 0, 0, 0); // October 23, 2026 is a Friday (day 5)
    expect(fridayMorning.getDay()).toBe(5);

    // Target is Friday at 18:00 (6:00 PM)
    const result = getUpcomingDayOfWeek(5, 18, 0, fridayMorning);

    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(9);
    expect(result.getDate()).toBe(23); // Same day!
    expect(result.getHours()).toBe(18);
    expect(result.getMinutes()).toBe(0);
  });

  it('pushes 7 days (next week) when target is today and current time is already at or past target time', () => {
    // Friday at 18:30 (6:30 PM)
    const fridayEvening = new Date(2026, 9, 23, 18, 30, 0, 0);
    expect(fridayEvening.getDay()).toBe(5);

    // Target was Friday at 18:00 (6:00 PM)
    const result = getUpcomingDayOfWeek(5, 18, 0, fridayEvening);

    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(9);
    expect(result.getDate()).toBe(30); // 7 days later (October 30, 2026)
    expect(result.getHours()).toBe(18);
    expect(result.getMinutes()).toBe(0);
  });

  it('pushes 7 days when target time is identical to current minute/second', () => {
    // Exact match: Friday at 18:00:00.000
    const fridayExact = new Date(2026, 9, 23, 18, 0, 0, 0);

    const result = getUpcomingDayOfWeek(5, 18, 0, fridayExact);

    expect(result.getDate()).toBe(30); // pushed to next week since 18:00 has arrived
  });

  it('correctly handles minute boundaries on same day', () => {
    // Friday at 17:59:59
    const justBefore = new Date(2026, 9, 23, 17, 59, 59, 0);
    const resultBefore = getUpcomingDayOfWeek(5, 18, 0, justBefore);
    expect(resultBefore.getDate()).toBe(23); // today!

    // Friday at 18:00:01
    const justAfter = new Date(2026, 9, 23, 18, 0, 1, 0);
    const resultAfter = getUpcomingDayOfWeek(5, 18, 0, justAfter);
    expect(resultAfter.getDate()).toBe(30); // next week!
  });

  it('returns tomorrow when target day is day after today', () => {
    // Friday morning
    const friday = new Date(2026, 9, 23, 10, 0, 0, 0);
    // Target Saturday (day 6) at 17:00 (5:00 PM)
    const result = getUpcomingDayOfWeek(6, 17, 0, friday);

    expect(result.getDate()).toBe(24); // Saturday Oct 24
    expect(result.getDay()).toBe(6);
    expect(result.getHours()).toBe(17);
  });

  it('wraps around to next week when target day is earlier in the week than today', () => {
    // Friday (day 5)
    const friday = new Date(2026, 9, 23, 10, 0, 0, 0);
    // Target Tuesday (day 2) at 09:00 AM
    const result = getUpcomingDayOfWeek(2, 9, 0, friday);

    expect(result.getDay()).toBe(2);
    // Friday is 23, Sat 24, Sun 25, Mon 26, Tue 27
    expect(result.getDate()).toBe(27);
    expect(result.getHours()).toBe(9);
  });

  it('formats dates consistently without throwing on valid ISO inputs', () => {
    const iso = '2026-10-24T17:00:00.000Z';
    expect(typeof formatDateTime(iso)).toBe('string');
    expect(typeof formatTimeOnly(iso)).toBe('string');
    expect(typeof formatDateShort(iso)).toBe('string');
    expect(formatDateTime('invalid-date')).toBe('invalid-date');
  });
});
