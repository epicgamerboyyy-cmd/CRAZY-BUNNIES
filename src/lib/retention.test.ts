import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
process.env.PGLITE_DIR = mkdtempSync(join(tmpdir(), "cb-retention-"));

const { getDb, schema } = await import("@/db");
const { removeExpiredBookingDetails, upcomingBookingsForPhone } = await import("./bookings");

const base = {
  staffId: "stylist-1",
  staffName: "Stylist 1",
  serviceId: "edge-up",
  serviceName: "Edge-up",
  durationMinutes: 15,
  clientType: "adult" as const,
  customerName: "Thandi Mokoena",
  phone: "082 123 4567",
  email: "thandi@example.com",
  notes: "Short on the sides",
};

function at(daysFromNow: number) {
  const start = new Date(Date.now() + daysFromNow * 86400000);
  return { startsAt: start, endsAt: new Date(start.getTime() + 15 * 60000) };
}

describe("client data retention", () => {
  it("wipes personal details from old appointments and leaves recent ones alone", async () => {
    const db = await getDb();
    const [old] = await db
      .insert(schema.bookings)
      .values({ ...base, ...at(-730), ref: "CB-OLD1", manageToken: "old".repeat(8), idempotencyKey: "old-key-0000000000" })
      .returning();
    const [recent] = await db
      .insert(schema.bookings)
      .values({ ...base, ...at(-30), staffId: "stylist-2", ref: "CB-NEW1", manageToken: "new".repeat(8), idempotencyKey: "new-key-0000000000" })
      .returning();

    expect(await removeExpiredBookingDetails()).toBe(1);

    const rows = await db.query.bookings.findMany();
    const wiped = rows.find((r) => r.id === old!.id)!;
    const kept = rows.find((r) => r.id === recent!.id)!;
    expect(wiped).toMatchObject({ customerName: "Former client", phone: "", email: null, notes: null, serviceId: "edge-up" });
    expect(kept.phone).toBe("082 123 4567");
  });

  it("matches a phone number however it's typed", async () => {
    const db = await getDb();
    await db
      .insert(schema.bookings)
      .values({ ...base, ...at(3), ref: "CB-UP01", manageToken: "upc".repeat(8), idempotencyKey: "upc-key-0000000000" });
    expect(await upcomingBookingsForPhone("+27 82 123 4567")).toBe(1);
    expect(await upcomingBookingsForPhone("0821234567")).toBe(1);
    expect(await upcomingBookingsForPhone("083 000 0000")).toBe(0);
  });
});
