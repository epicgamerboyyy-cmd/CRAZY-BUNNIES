import { describe, expect, it } from "vitest";
import type { OpeningHours } from "@/config/business";
import { generateSlots } from "@/lib/slots";
import { addDays, localDate, weekdayOf, zonedTimeToUtc } from "@/lib/time";

const TZ = "Africa/Johannesburg";
const hours: OpeningHours = {
  mon: [["09:00", "12:00"]],
  tue: [["09:00", "12:00"], ["13:00", "15:00"]],
  wed: [],
  thu: [],
  fri: [],
  sat: [],
  sun: [],
};
// 2026-10-19 is a Monday.
const MON = "2026-10-19";
const at = (date: string, time: string) => zonedTimeToUtc(date, time, TZ);
const base = {
  durationMinutes: 60,
  hours,
  closedDates: [],
  timezone: TZ,
  stepMinutes: 30,
  bufferMinutes: 0,
  minNoticeMinutes: 0,
  now: at("2026-10-01", "00:00"),
  busy: [],
};
const times = (slots: number[]) =>
  slots.map((s) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(s));

describe("time helpers", () => {
  it("converts SAST wall time to UTC", () => {
    expect(new Date(at(MON, "09:00")).toISOString()).toBe("2026-10-19T07:00:00.000Z");
  });
  it("reads local dates across midnight UTC", () => {
    expect(localDate(Date.parse("2026-10-19T23:30:00Z"), TZ)).toBe("2026-10-20");
  });
  it("knows weekdays and adds days across months", () => {
    expect(weekdayOf(MON)).toBe("mon");
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
  });
});

describe("generateSlots", () => {
  it("fits slots inside the opening window", () => {
    expect(times(generateSlots({ ...base, date: MON }))).toEqual(["09:00", "09:30", "10:00", "10:30", "11:00"]);
  });

  it("handles split windows", () => {
    const slots = times(generateSlots({ ...base, date: addDays(MON, 1) }));
    expect(slots).toEqual(["09:00", "09:30", "10:00", "10:30", "11:00", "13:00", "13:30", "14:00"]);
  });

  it("returns nothing on closed weekdays and closed dates", () => {
    expect(generateSlots({ ...base, date: addDays(MON, 2) })).toEqual([]);
    expect(generateSlots({ ...base, date: MON, closedDates: [MON] })).toEqual([]);
  });

  it("skips anything overlapping a busy interval, including the buffer", () => {
    const busy = [{ start: at(MON, "10:00"), end: at(MON, "10:30") }];
    expect(times(generateSlots({ ...base, date: MON, busy }))).toEqual(["09:00", "10:30", "11:00"]);
    expect(times(generateSlots({ ...base, date: MON, busy, bufferMinutes: 15 }))).toEqual(["11:00"]);
  });

  it("respects minimum notice", () => {
    const now = at(MON, "09:10");
    expect(times(generateSlots({ ...base, date: MON, now, minNoticeMinutes: 60 }))).toEqual(["10:30", "11:00"]);
  });

  it("returns nothing when the appointment is longer than the window", () => {
    expect(generateSlots({ ...base, date: MON, durationMinutes: 240 })).toEqual([]);
  });
});
