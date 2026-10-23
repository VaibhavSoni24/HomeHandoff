import { describe, it, expect } from 'vitest';
import { 
  getUpcomingDayOfWeek, 
  getRescheduledDateForPlan, 
  parseExplicitDate,
  formatDateTime, 
  formatTimeOnly, 
  formatDateShort 
} from '../utils/dateUtils';

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

  it('getRescheduledDateForPlan: reschedules relative to the existing plan date without skipping a week', () => {
    // Visit plan currently scheduled for Friday, Oct 23, 2026 at 6:00 PM
    const planFriday = new Date(2026, 9, 23, 18, 0, 0, 0).toISOString();

    // Reschedule to Saturday (day 6) at 17:00 (5:00 PM)
    const rescheduled = getRescheduledDateForPlan(planFriday, 6, 17, 0);

    expect(rescheduled.getFullYear()).toBe(2026);
    expect(rescheduled.getMonth()).toBe(9);
    expect(rescheduled.getDate()).toBe(24); // Exactly 1 day after Friday of that visit weekend!
    expect(rescheduled.getDay()).toBe(6); // Saturday
    expect(rescheduled.getHours()).toBe(17);
    expect(rescheduled.getMinutes()).toBe(0);
  });

  it('parseExplicitDate: parses explicit calendar dates and distinguishes from plain text', () => {
    const parsedIso = parseExplicitDate('Arrival moved to 2026-11-14');
    expect(parsedIso).not.toBeNull();
    expect(parsedIso?.getFullYear()).toBe(2026);
    expect(parsedIso?.getMonth()).toBe(10); // November is 10
    expect(parsedIso?.getDate()).toBe(14);

    const parsedMonthName = parseExplicitDate('Coming over on November 14th');
    expect(parsedMonthName).not.toBeNull();
    expect(parsedMonthName?.getMonth()).toBe(10);
    expect(parsedMonthName?.getDate()).toBe(14);

    expect(parseExplicitDate('what is the weather today')).toBeNull();
  });

  it('strictly validates calendar dates and rejects impossible dates without JS rollover', () => {
    // February 31 does not exist in any calendar
    expect(parseExplicitDate('Move the visit to February 31, 2026 at 5 PM')).toBeNull();
    expect(parseExplicitDate('2026-02-31')).toBeNull();
    expect(parseExplicitDate('April 31, 2026 at 5 PM')).toBeNull(); // April only has 30 days
    expect(parseExplicitDate('June 31, 2026')).toBeNull(); // June only has 30 days

    // Non-leap year Feb 29
    expect(parseExplicitDate('February 29, 2025 at 5 PM')).toBeNull();
    // Leap year Feb 29
    const leapDate = parseExplicitDate('February 29, 2024 at 5 PM');
    expect(leapDate).not.toBeNull();
    expect(leapDate?.getFullYear()).toBe(2024);
    expect(leapDate?.getMonth()).toBe(1);
    expect(leapDate?.getDate()).toBe(29);
  });

  it('extracts explicit time components accurately', () => {
    const with12h = parseExplicitDate('Move the visit to November 14, 2026 at 5 PM');
    expect(with12h?.getHours()).toBe(17);
    expect(with12h?.getMinutes()).toBe(0);

    const withMinute = parseExplicitDate('Move the visit to November 14, 2026 at 5:30 PM');
    expect(withMinute?.getHours()).toBe(17);
    expect(withMinute?.getMinutes()).toBe(30);

    const withMorning = parseExplicitDate('November 14, 2026 at 10:15 AM');
    expect(withMorning?.getHours()).toBe(10);
    expect(withMorning?.getMinutes()).toBe(15);

    const with24h = parseExplicitDate('2026-11-14 at 16:45');
    expect(with24h?.getHours()).toBe(16);
    expect(with24h?.getMinutes()).toBe(45);
  });
});

import type { CalendarEvent } from '../types/household';
import { findNextUpcomingEvent } from '../utils/dateUtils';

describe('dateUtils: findNextUpcomingEvent deterministic calculation', () => {
  const refTime = new Date('2026-11-14T12:00:00.000Z');

  const pastEvent: CalendarEvent = {
    id: 'evt-past',
    title: 'Morning Yoga',
    start: '2026-11-14T08:00:00.000Z',
    end: '2026-11-14T09:00:00.000Z',
    type: 'routine'
  };

  const inProgressEvent: CalendarEvent = {
    id: 'evt-in-progress',
    title: 'Family Lunch',
    start: '2026-11-14T11:30:00.000Z',
    end: '2026-11-14T13:00:00.000Z',
    type: 'family'
  };

  const nearFutureEvent: CalendarEvent = {
    id: 'evt-near-future',
    title: 'Parents Arrival',
    start: '2026-11-14T17:00:00.000Z',
    end: '2026-11-16T15:00:00.000Z',
    type: 'visitor'
  };

  const farFutureEvent: CalendarEvent = {
    id: 'evt-far-future',
    title: 'HVAC Inspection',
    start: '2026-11-20T10:00:00.000Z',
    end: '2026-11-20T11:00:00.000Z',
    type: 'routine'
  };

  it('returns null when event list is empty', () => {
    expect(findNextUpcomingEvent([], refTime)).toBeNull();
  });

  it('returns null when all events have already ended', () => {
    expect(findNextUpcomingEvent([pastEvent], refTime)).toBeNull();
  });

  it('detects and flags an in-progress event correctly', () => {
    const result = findNextUpcomingEvent([pastEvent, inProgressEvent, nearFutureEvent], refTime);
    expect(result).not.toBeNull();
    expect(result?.event.id).toBe('evt-in-progress');
    expect(result?.isInProgress).toBe(true);
  });

  it('selects the earliest upcoming event when no event is currently in progress', () => {
    const result = findNextUpcomingEvent([pastEvent, farFutureEvent, nearFutureEvent], refTime);
    expect(result).not.toBeNull();
    expect(result?.event.id).toBe('evt-near-future');
    expect(result?.isInProgress).toBe(false);
  });
});
