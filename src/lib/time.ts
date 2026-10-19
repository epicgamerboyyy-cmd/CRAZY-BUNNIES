import type { Weekday } from "@/config/business";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const isDateString = (s: string) => DATE_RE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
export const isTimeString = (s: string) => TIME_RE.test(s);

const offsetFormatters = new Map<string, Intl.DateTimeFormat>();

/** Offset of `tz` from UTC at the given instant, in minutes (SAST = +120). */
export function tzOffsetMinutes(instant: number, tz: string): number {
  let fmt = offsetFormatters.get(tz);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    offsetFormatters.set(tz, fmt);
  }
  const p = Object.fromEntries(fmt.formatToParts(new Date(instant)).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year!, +p.month! - 1, +p.day!, +p.hour!, +p.minute!, +p.second!);
  return Math.round((asUtc - Math.floor(instant / 1000) * 1000) / 60000);
}

/** Wall-clock date + time in `tz` to a UTC epoch ms. */
export function zonedTimeToUtc(date: string, time: string, tz: string): number {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const [hh, mm] = time.split(":").map(Number) as [number, number];
  const naive = Date.UTC(y, m - 1, d, hh, mm);
  let result = naive - tzOffsetMinutes(naive, tz) * 60000;
  // Second pass settles DST edges; a no-op for fixed-offset zones like SAST.
  result = naive - tzOffsetMinutes(result, tz) * 60000;
  return result;
}

/** YYYY-MM-DD of an instant as seen in `tz`. */
export function localDate(instant: number, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(instant),
  );
}

export function addDays(date: string, days: number): string {
  const t = Date.parse(`${date}T12:00:00Z`) + days * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

const WEEKDAYS: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
export function weekdayOf(date: string): Weekday {
  return WEEKDAYS[new Date(`${date}T12:00:00Z`).getUTCDay()]!;
}

export function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number) as [number, number];
  return h * 60 + m;
}

export function makeFormatters(locale: string, timeZone: string) {
  const time = new Intl.DateTimeFormat(locale, { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const dateLong = new Intl.DateTimeFormat(locale, { timeZone, weekday: "long", day: "numeric", month: "long" });
  const dateFull = new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const dayShort = new Intl.DateTimeFormat(locale, { timeZone, weekday: "short" });
  const dayNum = new Intl.DateTimeFormat(locale, { timeZone, day: "numeric" });
  const month = new Intl.DateTimeFormat(locale, { timeZone, month: "short" });
  // Calendar dates (YYYY-MM-DD) are formatted at UTC noon so the zone can't shift them.
  const cal = (f: Intl.DateTimeFormat) => (date: string) => f.format(new Date(`${date}T12:00:00Z`));
  const calLong = new Intl.DateTimeFormat(locale, { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
  const calShortDay = new Intl.DateTimeFormat(locale, { timeZone: "UTC", weekday: "short" });
  const calDayNum = new Intl.DateTimeFormat(locale, { timeZone: "UTC", day: "numeric" });
  const calMonth = new Intl.DateTimeFormat(locale, { timeZone: "UTC", month: "short" });
  return {
    time: (t: number | Date) => time.format(t),
    dateLong: (t: number | Date) => dateLong.format(t),
    dateFull: (t: number | Date) => dateFull.format(t),
    dayShort: (t: number | Date) => dayShort.format(t),
    dayNum: (t: number | Date) => dayNum.format(t),
    month: (t: number | Date) => month.format(t),
    calLong: cal(calLong),
    calShortDay: cal(calShortDay),
    calDayNum: cal(calDayNum),
    calMonth: cal(calMonth),
  };
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Current time. Wrapped so server components read the clock in one obvious place. */
export const nowMs = () => Date.now();
