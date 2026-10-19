import type { OpeningHours } from "@/config/business";
import { minutesOf, weekdayOf, zonedTimeToUtc } from "@/lib/time";

export interface Interval {
  start: number;
  end: number;
}

export interface SlotInput {
  date: string;
  durationMinutes: number;
  hours: OpeningHours;
  closedDates: string[];
  timezone: string;
  stepMinutes: number;
  bufferMinutes: number;
  minNoticeMinutes: number;
  now: number;
  /** Existing bookings, blocked time and calendar busy periods, as raw intervals. */
  busy: Interval[];
}

const MIN = 60000;

/**
 * Start times (UTC ms) for an appointment of `durationMinutes` on `date`.
 * A slot must fit fully inside an opening window and keep `bufferMinutes`
 * clear of anything busy on either side.
 */
export function generateSlots(input: SlotInput): number[] {
  const { date, durationMinutes, timezone, stepMinutes, bufferMinutes } = input;
  if (input.closedDates.includes(date)) return [];
  const windows = input.hours[weekdayOf(date)];
  if (!windows?.length) return [];

  const earliest = input.now + input.minNoticeMinutes * MIN;
  const pad = bufferMinutes * MIN;
  const busy = input.busy.map((b) => ({ start: b.start - pad, end: b.end + pad }));
  const slots: number[] = [];

  for (const [open, close] of windows) {
    const length = minutesOf(close) - minutesOf(open);
    const openAt = zonedTimeToUtc(date, open, timezone);
    for (let offset = 0; offset + durationMinutes <= length; offset += stepMinutes) {
      const start = openAt + offset * MIN;
      const end = start + durationMinutes * MIN;
      if (start < earliest) continue;
      if (busy.some((b) => start < b.end && end > b.start)) continue;
      slots.push(start);
    }
  }
  return slots.sort((a, b) => a - b);
}

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && a.end > b.start;
}
