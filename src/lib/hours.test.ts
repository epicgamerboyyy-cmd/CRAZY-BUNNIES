import { describe, expect, it } from "vitest";
import type { OpeningHours } from "@/config/business";
import { openStatus } from "@/lib/hours";
import { zonedTimeToUtc } from "@/lib/time";

const TZ = "Africa/Johannesburg";
const hours: OpeningHours = {
  mon: [],
  tue: [["09:00", "17:00"]],
  wed: [["09:00", "17:00"]],
  thu: [["09:00", "17:00"]],
  fri: [["09:00", "17:00"]],
  sat: [["09:00", "15:00"]],
  sun: [],
};
// 2026-10-20 is a Tuesday.
const at = (date: string, time: string) => zonedTimeToUtc(date, time, TZ);

describe("openStatus", () => {
  it("is open during hours", () => {
    expect(openStatus(hours, [], at("2026-10-20", "10:30"), TZ)).toEqual({ open: true, text: "Open now until 17:00" });
  });
  it("says when it opens later today", () => {
    expect(openStatus(hours, [], at("2026-10-20", "07:00"), TZ).text).toBe("Closed now, opens today at 09:00");
  });
  it("says tomorrow after closing", () => {
    expect(openStatus(hours, [], at("2026-10-20", "17:00"), TZ).text).toBe("Closed now, opens tomorrow at 09:00");
  });
  it("skips closed days", () => {
    expect(openStatus(hours, [], at("2026-10-24", "16:00"), TZ).text).toBe("Closed now, opens Tuesday at 09:00");
  });
  it("respects closed dates", () => {
    expect(openStatus(hours, ["2026-10-20"], at("2026-10-20", "10:00"), TZ).text).toBe("Closed now, opens tomorrow at 09:00");
  });
});
