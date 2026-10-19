import type { OpeningHours, Weekday } from "@/config/business";
import { addDays, localDate, minutesOf, weekdayOf } from "@/lib/time";

export const WEEK_ORDER: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const DAY_NAMES: Record<Weekday, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export interface OpenStatus {
  open: boolean;
  /** e.g. "Open now until 17:00" or "Closed, opens Tuesday at 09:00" */
  text: string;
}

/** Minutes past midnight for an instant, in the given zone. */
function localMinutes(instant: number, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .format(instant)
    .split(":")
    .map(Number);
  return parts[0]! * 60 + parts[1]!;
}

export function openStatus(hours: OpeningHours, closedDates: string[], now: number, tz: string): OpenStatus {
  const today = localDate(now, tz);
  const mins = localMinutes(now, tz);
  if (!closedDates.includes(today)) {
    for (const [open, close] of hours[weekdayOf(today)]) {
      if (mins >= minutesOf(open) && mins < minutesOf(close)) return { open: true, text: `Open now until ${close}` };
      if (mins < minutesOf(open)) return { open: false, text: `Closed now, opens today at ${open}` };
    }
  }
  for (let i = 1; i <= 14; i++) {
    const d = addDays(today, i);
    const first = hours[weekdayOf(d)][0];
    if (first && !closedDates.includes(d)) {
      const when = i === 1 ? "tomorrow" : DAY_NAMES[weekdayOf(d)];
      return { open: false, text: `Closed now, opens ${when} at ${first[0]}` };
    }
  }
  return { open: false, text: "Closed" };
}
