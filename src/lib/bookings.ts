import "server-only";
import { randomBytes, randomInt } from "node:crypto";
import { and, asc, eq, gt, gte, lt, ne } from "drizzle-orm";
import { business, getService } from "@/config/business";
import { getDb, schema } from "@/db";
import type { Block, Booking, BookingStatus } from "@/db/schema";
import { calendarBusy, createCalendarEvent, deleteCalendarEvent, isCalendarConfigured } from "@/lib/gcal";
import { generateSlots, type Interval } from "@/lib/slots";
import { addDays, localDate, makeFormatters, weekdayOf, zonedTimeToUtc } from "@/lib/time";

const { bookings, blocks } = schema;
const TZ = business.timezone;
const fmt = makeFormatters(business.locale, TZ);

export type DayStatus = "open" | "full" | "closed";
export interface DayAvailability {
  date: string;
  status: DayStatus;
  slots: string[];
}

/** Postgres error code, looking through driver/ORM wrappers. */
function pgCode(err: unknown): string | undefined {
  let e: unknown = err;
  for (let i = 0; i < 4 && e && typeof e === "object"; i++) {
    const code = (e as { code?: unknown }).code;
    if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) return code;
    e = (e as { cause?: unknown }).cause;
  }
  return undefined;
}

export const todayLocal = () => localDate(Date.now(), TZ);
export const isOpenOn = (date: string) =>
  !business.closedDates.includes(date) && (business.hours[weekdayOf(date)]?.length ?? 0) > 0;
export const lastBookableDate = () => addDays(todayLocal(), business.booking.maxDaysAhead);

async function busyBetween(from: number, to: number): Promise<Interval[]> {
  const db = await getDb();
  const [bookingRows, blockRows, calendar] = await Promise.all([
    db
      .select({ start: bookings.startsAt, end: bookings.endsAt })
      .from(bookings)
      .where(and(ne(bookings.status, "cancelled"), lt(bookings.startsAt, new Date(to)), gt(bookings.endsAt, new Date(from)))),
    db
      .select({ start: blocks.startsAt, end: blocks.endsAt })
      .from(blocks)
      .where(and(lt(blocks.startsAt, new Date(to)), gt(blocks.endsAt, new Date(from)))),
    calendarBusy(from, to).catch((err) => {
      // Keep taking bookings if Google is down, but leave a trace.
      console.error("[gcal] free/busy lookup failed", err);
      return [] as Interval[];
    }),
  ]);
  return [
    ...bookingRows.map((r) => ({ start: r.start.getTime(), end: r.end.getTime() })),
    ...blockRows.map((r) => ({ start: r.start.getTime(), end: r.end.getTime() })),
    ...calendar,
  ];
}

export async function getAvailability(serviceId: string, from: string, days: number): Promise<DayAvailability[]> {
  const service = getService(serviceId);
  if (!service) throw new Error("Unknown service");
  const first = from < todayLocal() ? todayLocal() : from;
  const last = lastBookableDate();
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(first, i);
    if (d > last) break;
    dates.push(d);
  }
  if (!dates.length) return [];

  const rangeStart = zonedTimeToUtc(dates[0]!, "00:00", TZ);
  const rangeEnd = zonedTimeToUtc(addDays(dates.at(-1)!, 1), "00:00", TZ);
  const busy = await busyBetween(rangeStart, rangeEnd);
  const now = Date.now();

  return dates.map((date) => {
    const slots = generateSlots({
      date,
      durationMinutes: service.durationMinutes,
      hours: business.hours,
      closedDates: business.closedDates,
      timezone: TZ,
      stepMinutes: business.booking.slotStepMinutes,
      bufferMinutes: business.booking.bufferMinutes,
      minNoticeMinutes: business.booking.minNoticeMinutes,
      now,
      busy,
    });
    return {
      date,
      status: slots.length ? "open" : isOpenOn(date) ? "full" : "closed",
      slots: slots.map((s) => new Date(s).toISOString()),
    };
  });
}

const REF_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const newRef = () => `CB-${Array.from({ length: 6 }, () => REF_ALPHABET[randomInt(REF_ALPHABET.length)]).join("")}`;

export interface NewBooking {
  serviceId: string;
  startsAt: Date;
  customerName: string;
  phone: string;
  email: string | null;
  notes: string | null;
  idempotencyKey: string;
}

export type CreateResult =
  | { ok: true; booking: Booking }
  | { ok: false; reason: "unknown_service" | "slot_unavailable" };

export async function createBooking(input: NewBooking): Promise<CreateResult> {
  const db = await getDb();
  const existing = await db.query.bookings.findFirst({ where: eq(bookings.idempotencyKey, input.idempotencyKey) });
  if (existing) return { ok: true, booking: existing };

  const service = getService(input.serviceId);
  if (!service) return { ok: false, reason: "unknown_service" };

  // Re-check against live availability so a stale or hand-crafted request can't
  // book outside opening hours. The DB constraint covers the race after this.
  const date = localDate(input.startsAt.getTime(), TZ);
  const [day] = await getAvailability(service.id, date, 1);
  if (!day || day.date !== date || !day.slots.includes(input.startsAt.toISOString())) {
    return { ok: false, reason: "slot_unavailable" };
  }

  const endsAt = new Date(input.startsAt.getTime() + service.durationMinutes * 60000);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const [booking] = await db
        .insert(bookings)
        .values({
          ref: newRef(),
          manageToken: randomBytes(24).toString("base64url"),
          idempotencyKey: input.idempotencyKey,
          serviceId: service.id,
          serviceName: service.name,
          durationMinutes: service.durationMinutes,
          startsAt: input.startsAt,
          endsAt,
          customerName: input.customerName,
          phone: input.phone,
          email: input.email,
          notes: input.notes,
        })
        .returning();
      return { ok: true, booking: booking! };
    } catch (err) {
      const code = pgCode(err);
      if (code === "23P01") return { ok: false, reason: "slot_unavailable" };
      if (code === "23505") {
        // Double submit raced past the first check, or a ref collision (retry).
        const dup = await db.query.bookings.findFirst({ where: eq(bookings.idempotencyKey, input.idempotencyKey) });
        if (dup) return { ok: true, booking: dup };
        continue;
      }
      throw err;
    }
  }
  throw new Error("Could not create booking");
}

function eventDescription(b: Booking): string {
  return [
    `Ref: ${b.ref}`,
    `Service: ${b.serviceName}`,
    `Customer: ${b.customerName}`,
    `Phone: ${b.phone}`,
    b.email ? `Email: ${b.email}` : null,
    b.notes ? `Notes: ${b.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Pushes a booking to Google Calendar. Never throws; failures are stored for the dashboard. */
export async function syncBookingToCalendar(b: Booking): Promise<void> {
  if (!isCalendarConfigured() || b.gcalEventId || b.status === "cancelled") return;
  const db = await getDb();
  try {
    const eventId = await createCalendarEvent({
      summary: `${b.customerName}: ${b.serviceName}`,
      description: eventDescription(b),
      start: b.startsAt,
      end: b.endsAt,
      timezone: TZ,
      bookingId: b.id,
    });
    if (eventId) {
      await db.update(bookings).set({ gcalEventId: eventId, gcalError: null }).where(eq(bookings.id, b.id));
    }
  } catch (err) {
    console.error("[gcal] create event failed", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    await db.update(bookings).set({ gcalError: message.slice(0, 300) }).where(eq(bookings.id, b.id));
  }
}

export async function getBookingByToken(token: string): Promise<Booking | undefined> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return undefined;
  const db = await getDb();
  return db.query.bookings.findFirst({ where: eq(bookings.manageToken, token) });
}

export async function getBookingById(id: string): Promise<Booking | undefined> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return undefined;
  const db = await getDb();
  return db.query.bookings.findFirst({ where: eq(bookings.id, id) });
}

export const hasEnded = (b: Pick<Booking, "endsAt">, now = Date.now()) => b.endsAt.getTime() < now;
export const isUpcoming = (b: Pick<Booking, "startsAt">, now = Date.now()) => b.startsAt.getTime() > now;

export function canCustomerCancel(b: Booking, now = Date.now()): boolean {
  return b.status === "confirmed" && b.startsAt.getTime() - now >= business.booking.cancelCutoffMinutes * 60000;
}

export async function setBookingStatus(id: string, status: BookingStatus, by: "customer" | "owner"): Promise<Booking | undefined> {
  const db = await getDb();
  const [updated] = await db
    .update(bookings)
    .set({
      status,
      updatedAt: new Date(),
      ...(status === "cancelled" ? { cancelledBy: by } : {}),
    })
    .where(eq(bookings.id, id))
    .returning();
  if (updated && status === "cancelled" && updated.gcalEventId) {
    try {
      await deleteCalendarEvent(updated.gcalEventId);
      await db.update(bookings).set({ gcalEventId: null, gcalError: null }).where(eq(bookings.id, id));
    } catch (err) {
      console.error("[gcal] delete event failed", err);
      await db.update(bookings).set({ gcalError: "Cancelled here, but the calendar event could not be removed." }).where(eq(bookings.id, id));
    }
  }
  return updated;
}

export async function listBookingsForDay(date: string): Promise<Booking[]> {
  const db = await getDb();
  const start = new Date(zonedTimeToUtc(date, "00:00", TZ));
  const end = new Date(zonedTimeToUtc(addDays(date, 1), "00:00", TZ));
  return db.query.bookings.findMany({
    where: and(gte(bookings.startsAt, start), lt(bookings.startsAt, end)),
    orderBy: [asc(bookings.startsAt)],
  });
}

export async function upcomingCounts(from: string, days: number): Promise<Record<string, number>> {
  const db = await getDb();
  const start = new Date(zonedTimeToUtc(from, "00:00", TZ));
  const end = new Date(zonedTimeToUtc(addDays(from, days), "00:00", TZ));
  const rows = await db
    .select({ startsAt: bookings.startsAt })
    .from(bookings)
    .where(and(ne(bookings.status, "cancelled"), gte(bookings.startsAt, start), lt(bookings.startsAt, end)));
  const counts: Record<string, number> = {};
  for (const r of rows) {
    const d = localDate(r.startsAt.getTime(), TZ);
    counts[d] = (counts[d] ?? 0) + 1;
  }
  return counts;
}

export async function listUnsynced(): Promise<Booking[]> {
  const db = await getDb();
  return db.query.bookings.findMany({
    where: and(eq(bookings.status, "confirmed"), gt(bookings.startsAt, new Date())),
    orderBy: [asc(bookings.startsAt)],
  }).then((rows) => rows.filter((r) => !r.gcalEventId));
}

export async function listUpcomingBlocks(): Promise<Block[]> {
  const db = await getDb();
  return db.query.blocks.findMany({ where: gt(blocks.endsAt, new Date()), orderBy: [asc(blocks.startsAt)] });
}

export async function addBlock(startsAt: Date, endsAt: Date, reason: string | null): Promise<void> {
  const db = await getDb();
  await db.insert(blocks).values({ startsAt, endsAt, reason });
}

export async function removeBlock(id: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  const db = await getDb();
  await db.delete(blocks).where(eq(blocks.id, id));
}

/** Confirmed bookings that overlap a range, used to warn before blocking time. */
export async function bookingsOverlapping(startsAt: Date, endsAt: Date): Promise<Booking[]> {
  const db = await getDb();
  return db.query.bookings.findMany({
    where: and(ne(bookings.status, "cancelled"), lt(bookings.startsAt, endsAt), gt(bookings.endsAt, startsAt)),
    orderBy: [asc(bookings.startsAt)],
  });
}

export function describeSlot(b: Pick<Booking, "startsAt" | "endsAt">): string {
  return `${fmt.dateFull(b.startsAt)}, ${fmt.time(b.startsAt)} to ${fmt.time(b.endsAt)}`;
}
