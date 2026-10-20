import "server-only";
import { randomBytes, randomInt } from "node:crypto";
import { and, asc, count, eq, gt, gte, isNull, lt, ne, or, sql } from "drizzle-orm";
import {
  business,
  getService,
  getStaff,
  hoursFor,
  staffDoesService,
  staffForService,
  type Service,
  type StaffMember,
} from "@/config/business";
import { getDb, schema } from "@/db";
import type { Block, Booking, BookingStatus } from "@/db/schema";
import { calendarBusy, createCalendarEvent, deleteCalendarEvent, isCalendarConfigured } from "@/lib/gcal";
import { generateSlots, type Interval } from "@/lib/slots";
import { addDays, localDate, makeFormatters, weekdayOf, zonedTimeToUtc } from "@/lib/time";
import { logError } from "@/lib/request";

const { bookings, blocks } = schema;
const TZ = business.timezone;
const fmt = makeFormatters(business.locale, TZ);

/** Booking with whoever is free. */
export const ANY_STAFF = "any";

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

interface StaffBusy extends Interval {
  /** undefined means it applies to everyone (whole-shop block or shop calendar). */
  staffId?: string;
}

async function busyBetween(from: number, to: number): Promise<StaffBusy[]> {
  const db = await getDb();
  const [bookingRows, blockRows, calendar] = await Promise.all([
    db
      .select({ start: bookings.startsAt, end: bookings.endsAt, staffId: bookings.staffId })
      .from(bookings)
      .where(and(ne(bookings.status, "cancelled"), lt(bookings.startsAt, new Date(to)), gt(bookings.endsAt, new Date(from)))),
    db
      .select({ start: blocks.startsAt, end: blocks.endsAt, staffId: blocks.staffId })
      .from(blocks)
      .where(and(lt(blocks.startsAt, new Date(to)), gt(blocks.endsAt, new Date(from)))),
    calendarBusy(from, to).catch((err) => {
      // Keep taking bookings if Google is down, but leave a trace.
      logError("gcal free/busy", err);
      return [] as Interval[];
    }),
  ]);
  return [
    ...bookingRows.map((r) => ({ start: r.start.getTime(), end: r.end.getTime(), staffId: r.staffId })),
    ...blockRows.map((r) => ({ start: r.start.getTime(), end: r.end.getTime(), staffId: r.staffId ?? undefined })),
    ...calendar,
  ];
}

function dateRange(from: string, days: number): string[] {
  const first = from < todayLocal() ? todayLocal() : from;
  const last = lastBookableDate();
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(first, i);
    if (d > last) break;
    dates.push(d);
  }
  return dates;
}

function slotsFor(staff: StaffMember, service: Service, date: string, busy: StaffBusy[], now: number): number[] {
  return generateSlots({
    date,
    durationMinutes: service.durationMinutes,
    hours: hoursFor(staff),
    closedDates: business.closedDates,
    timezone: TZ,
    stepMinutes: business.booking.slotStepMinutes,
    bufferMinutes: business.booking.bufferMinutes,
    minNoticeMinutes: business.booking.minNoticeMinutes,
    now,
    busy: busy.filter((b) => b.staffId === undefined || b.staffId === staff.id),
  });
}

/** Staff who could do this service, narrowed to one person unless "any". */
function candidates(service: Service, staffId: string): StaffMember[] | null {
  if (staffId === ANY_STAFF) return staffForService(service.id);
  const staff = getStaff(staffId);
  return staff && staffDoesService(staff, service) ? [staff] : null;
}

export async function getAvailability(
  serviceId: string,
  staffId: string,
  from: string,
  days: number,
): Promise<DayAvailability[]> {
  const service = getService(serviceId);
  if (!service) throw new Error("Unknown service");
  const team = candidates(service, staffId);
  if (!team) throw new Error("That person doesn't do this service");
  const dates = dateRange(from, days);
  if (!dates.length) return [];

  const busy = await busyBetween(
    zonedTimeToUtc(dates[0]!, "00:00", TZ),
    zonedTimeToUtc(addDays(dates.at(-1)!, 1), "00:00", TZ),
  );
  const now = Date.now();

  return dates.map((date) => {
    const all = new Set<number>();
    for (const person of team) for (const s of slotsFor(person, service, date, busy, now)) all.add(s);
    const slots = [...all].sort((a, b) => a - b);
    const works = team.some((p) => isOpenOn(date) && (hoursFor(p)[weekdayOf(date)]?.length ?? 0) > 0);
    return {
      date,
      status: slots.length ? "open" : works ? "full" : "closed",
      slots: slots.map((s) => new Date(s).toISOString()),
    };
  });
}

/**
 * Who can take this exact start time, least busy that day first, so "anyone
 * available" spreads work across the team instead of always picking the same person.
 */
async function freeStaffAt(service: Service, staffId: string, start: number): Promise<StaffMember[]> {
  const team = candidates(service, staffId) ?? [];
  const date = localDate(start, TZ);
  const busy = await busyBetween(zonedTimeToUtc(date, "00:00", TZ), zonedTimeToUtc(addDays(date, 1), "00:00", TZ));
  const now = Date.now();
  const load = (id: string) => busy.filter((b) => b.staffId === id).length;
  return team
    .filter((p) => slotsFor(p, service, date, busy, now).includes(start))
    .map((p, order) => ({ p, order, load: load(p.id) }))
    .sort((a, b) => a.load - b.load || a.order - b.order)
    .map((x) => x.p);
}

const REF_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const newRef = () => `CB-${Array.from({ length: 6 }, () => REF_ALPHABET[randomInt(REF_ALPHABET.length)]).join("")}`;

export interface NewBooking {
  serviceId: string;
  /** A staff id, or ANY_STAFF to assign whoever is free. */
  staffId: string;
  startsAt: Date;
  clientType: "child" | "adult";
  customerName: string;
  phone: string;
  email: string | null;
  notes: string | null;
  idempotencyKey: string;
}

export type CreateResult =
  | { ok: true; booking: Booking }
  | { ok: false; reason: "unknown_service" | "unknown_staff" | "slot_unavailable" };

export async function createBooking(input: NewBooking): Promise<CreateResult> {
  const db = await getDb();
  const existing = await db.query.bookings.findFirst({ where: eq(bookings.idempotencyKey, input.idempotencyKey) });
  if (existing) return { ok: true, booking: existing };

  const service = getService(input.serviceId);
  if (!service) return { ok: false, reason: "unknown_service" };
  if (!candidates(service, input.staffId)) return { ok: false, reason: "unknown_staff" };

  // Re-check against live availability so a stale or hand-crafted request can't
  // book outside working hours. The DB constraint covers the race after this.
  const options = await freeStaffAt(service, input.staffId, input.startsAt.getTime());
  if (!options.length) return { ok: false, reason: "slot_unavailable" };

  const endsAt = new Date(input.startsAt.getTime() + service.durationMinutes * 60000);
  // For "anyone", try the next free person if someone else grabbed the first one meanwhile.
  for (const person of options) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const [booking] = await db
          .insert(bookings)
          .values({
            ref: newRef(),
            manageToken: randomBytes(24).toString("base64url"),
            idempotencyKey: input.idempotencyKey,
            staffId: person.id,
            staffName: person.name,
            serviceId: service.id,
            serviceName: service.name,
            durationMinutes: service.durationMinutes,
            startsAt: input.startsAt,
            endsAt,
            clientType: input.clientType,
            customerName: input.customerName,
            phone: input.phone,
            email: input.email,
            notes: input.notes,
          })
          .returning();
        return { ok: true, booking: booking! };
      } catch (err) {
        const code = pgCode(err);
        if (code === "23P01") break;
        if (code === "23505") {
          // Double submit raced past the first check, or a ref collision (retry).
          const dup = await db.query.bookings.findFirst({ where: eq(bookings.idempotencyKey, input.idempotencyKey) });
          if (dup) return { ok: true, booking: dup };
          continue;
        }
        throw err;
      }
    }
  }
  return { ok: false, reason: "slot_unavailable" };
}

function eventDescription(b: Booking): string {
  return [
    `Ref: ${b.ref}`,
    `With: ${b.staffName}`,
    `Service: ${b.serviceName}`,
    `Customer: ${b.customerName}${b.clientType ? ` (${b.clientType})` : ""}`,
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
      summary: `${b.customerName}: ${b.serviceName} with ${b.staffName}`,
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
    logError("gcal create", err);
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
      logError("gcal delete", err);
      await db.update(bookings).set({ gcalError: "Cancelled here, but the calendar event could not be removed." }).where(eq(bookings.id, id));
    }
  }
  return updated;
}

export async function listBookingsForDay(date: string, staffId?: string): Promise<Booking[]> {
  const db = await getDb();
  const start = new Date(zonedTimeToUtc(date, "00:00", TZ));
  const end = new Date(zonedTimeToUtc(addDays(date, 1), "00:00", TZ));
  return db.query.bookings.findMany({
    where: and(
      gte(bookings.startsAt, start),
      lt(bookings.startsAt, end),
      staffId ? eq(bookings.staffId, staffId) : undefined,
    ),
    orderBy: [asc(bookings.startsAt)],
  });
}

export async function upcomingCounts(from: string, days: number, staffId?: string): Promise<Record<string, number>> {
  const db = await getDb();
  const start = new Date(zonedTimeToUtc(from, "00:00", TZ));
  const end = new Date(zonedTimeToUtc(addDays(from, days), "00:00", TZ));
  const rows = await db
    .select({ startsAt: bookings.startsAt })
    .from(bookings)
    .where(
      and(
        ne(bookings.status, "cancelled"),
        gte(bookings.startsAt, start),
        lt(bookings.startsAt, end),
        staffId ? eq(bookings.staffId, staffId) : undefined,
      ),
    );
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

export async function listUpcomingBlocks(staffId?: string): Promise<Block[]> {
  const db = await getDb();
  return db.query.blocks.findMany({
    where: and(
      gt(blocks.endsAt, new Date()),
      staffId ? or(isNull(blocks.staffId), eq(blocks.staffId, staffId)) : undefined,
    ),
    orderBy: [asc(blocks.startsAt)],
  });
}

export async function addBlock(startsAt: Date, endsAt: Date, reason: string | null, staffId: string | null): Promise<void> {
  const db = await getDb();
  await db.insert(blocks).values({ startsAt, endsAt, reason, staffId });
}

export async function removeBlock(id: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  const db = await getDb();
  await db.delete(blocks).where(eq(blocks.id, id));
}

/** Confirmed bookings that overlap a range, used to warn before blocking time. */
export async function bookingsOverlapping(startsAt: Date, endsAt: Date, staffId: string | null): Promise<Booking[]> {
  const db = await getDb();
  return db.query.bookings.findMany({
    where: and(
      ne(bookings.status, "cancelled"),
      lt(bookings.startsAt, endsAt),
      gt(bookings.endsAt, startsAt),
      staffId ? eq(bookings.staffId, staffId) : undefined,
    ),
    orderBy: [asc(bookings.startsAt)],
  });
}

export function describeSlot(b: Pick<Booking, "startsAt" | "endsAt">): string {
  return `${fmt.dateFull(b.startsAt)}, ${fmt.time(b.startsAt)} to ${fmt.time(b.endsAt)}`;
}

/** Upcoming confirmed bookings under this phone number, matched on the last 9 digits so 082… and +2782… agree. */
export async function upcomingBookingsForPhone(phone: string): Promise<number> {
  const digits = phone.replace(/\D/g, "").slice(-9);
  const db = await getDb();
  const [{ n } = { n: 0 }] = await db
    .select({ n: count() })
    .from(bookings)
    .where(
      and(
        eq(bookings.status, "confirmed"),
        gt(bookings.endsAt, new Date()),
        sql`right(regexp_replace(${bookings.phone}, '[^0-9]', '', 'g'), 9) = ${digits}`,
      ),
    );
  return Number(n);
}

/**
 * POPIA: don't keep personal details longer than needed. Once an appointment is
 * older than the retention period, the name, phone, email and notes are wiped.
 * The appointment itself stays, so the owner's history and counts still work.
 */
export async function removeExpiredBookingDetails(): Promise<number> {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - business.dataRetentionMonths);
  const db = await getDb();
  const wiped = await db
    .update(bookings)
    .set({ customerName: "Former client", phone: "", email: null, notes: null, updatedAt: new Date() })
    .where(and(lt(bookings.endsAt, cutoff), ne(bookings.phone, "")))
    .returning({ id: bookings.id });
  return wiped.length;
}
