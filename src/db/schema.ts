import { boolean, date, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const BOOKING_STATUSES = ["confirmed", "completed", "no_show", "cancelled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ref: text("ref").notNull().unique(),
    manageToken: text("manage_token").notNull().unique(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    staffId: text("staff_id").notNull(),
    staffName: text("staff_name").notNull(),
    serviceId: text("service_id").notNull(),
    serviceName: text("service_name").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    clientType: text("client_type").$type<"child" | "adult">(),
    customerName: text("customer_name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    notes: text("notes"),
    status: text("status").$type<BookingStatus>().notNull().default("confirmed"),
    cancelledBy: text("cancelled_by").$type<"customer" | "owner">(),
    gcalEventId: text("gcal_event_id"),
    gcalError: text("gcal_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("bookings_starts_at_idx").on(t.startsAt)],
);

export const blocks = pgTable(
  "blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** null blocks the whole shop */
    staffId: text("staff_id"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("blocks_starts_at_idx").on(t.startsAt)],
);

export const authAttempts = pgTable("auth_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull(),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});

export const FEEDBACK_KINDS = ["complaint", "improvement", "compliment"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];
export const FEEDBACK_STATUSES = ["new", "in_progress", "resolved"] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export const feedback = pgTable(
  "feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ref: text("ref").notNull().unique(),
    kind: text("kind").$type<FeedbackKind>().notNull(),
    message: text("message").notNull(),
    visitDate: date("visit_date"),
    staffId: text("staff_id"),
    serviceId: text("service_id"),
    name: text("name"),
    contact: text("contact"),
    wantsReply: boolean("wants_reply").notNull().default(false),
    status: text("status").$type<FeedbackStatus>().notNull().default("new"),
    ownerNote: text("owner_note"),
    /** Salted hash of the sender's IP, only for rate limiting. */
    senderHash: text("sender_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("feedback_created_idx").on(t.createdAt)],
);

export type Feedback = typeof feedback.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Block = typeof blocks.$inferSelect;

/**
 * Applied on first connection. Idempotent, so it's safe on every cold start.
 * The exclusion constraint is what actually stops double bookings: two active
 * bookings for the same staff member can never overlap, even if requests race.
 */
export const SCHEMA_SQL = [
  `CREATE EXTENSION IF NOT EXISTS btree_gist`,
  `CREATE TABLE IF NOT EXISTS bookings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ref text NOT NULL UNIQUE,
    manage_token text NOT NULL UNIQUE,
    idempotency_key text NOT NULL UNIQUE,
    service_id text NOT NULL,
    service_name text NOT NULL,
    duration_minutes integer NOT NULL,
    starts_at timestamptz NOT NULL,
    ends_at timestamptz NOT NULL,
    customer_name text NOT NULL,
    phone text NOT NULL,
    email text,
    notes text,
    status text NOT NULL DEFAULT 'confirmed',
    cancelled_by text,
    gcal_event_id text,
    gcal_error text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (ends_at > starts_at),
    CHECK (status IN ('confirmed','completed','no_show','cancelled'))
  )`,
  `CREATE INDEX IF NOT EXISTS bookings_starts_at_idx ON bookings (starts_at)`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS staff_id text NOT NULL DEFAULT 'unassigned'`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS staff_name text NOT NULL DEFAULT ''`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_type text`,
  // The first version allowed one appointment at a time for the whole shop.
  `ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap`,
  `DO $$ BEGIN
    ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap_per_staff
      EXCLUDE USING gist (staff_id WITH =, tstzrange(starts_at, ends_at) WITH &&) WHERE (status <> 'cancelled');
  EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$`,
  `CREATE INDEX IF NOT EXISTS bookings_staff_starts_idx ON bookings (staff_id, starts_at)`,
  `CREATE TABLE IF NOT EXISTS blocks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    starts_at timestamptz NOT NULL,
    ends_at timestamptz NOT NULL,
    reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (ends_at > starts_at)
  )`,
  `CREATE INDEX IF NOT EXISTS blocks_starts_at_idx ON blocks (starts_at)`,
  `ALTER TABLE blocks ADD COLUMN IF NOT EXISTS staff_id text`,
  `CREATE TABLE IF NOT EXISTS auth_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text NOT NULL,
    at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS auth_attempts_key_at_idx ON auth_attempts (key, at)`,
  `CREATE TABLE IF NOT EXISTS feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ref text NOT NULL UNIQUE,
    kind text NOT NULL CHECK (kind IN ('complaint','improvement','compliment')),
    message text NOT NULL,
    visit_date date,
    staff_id text,
    service_id text,
    name text,
    contact text,
    wants_reply boolean NOT NULL DEFAULT false,
    status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_progress','resolved')),
    owner_note text,
    sender_hash text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS feedback_created_idx ON feedback (created_at)`,
  `CREATE INDEX IF NOT EXISTS feedback_sender_idx ON feedback (sender_hash, created_at)`,
];
