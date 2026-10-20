import "server-only";
import { randomInt } from "node:crypto";
import { and, count, desc, eq, gt, isNotNull, lt, or } from "drizzle-orm";
import { business } from "@/config/business";
import { getDb, schema } from "@/db";
import { clientHash } from "@/lib/request";
import type { Feedback, FeedbackKind, FeedbackStatus } from "@/db/schema";

const { feedback } = schema;
const MAX_PER_HOUR = 5;
const REF_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const newRef = () => `FB-${Array.from({ length: 6 }, () => REF_ALPHABET[randomInt(REF_ALPHABET.length)]).join("")}`;

/** A salted hash of the visitor's IP. We never store the IP itself. */
const senderHash = () => clientHash("feedback");

export interface NewFeedback {
  kind: FeedbackKind;
  message: string;
  visitDate: string | null;
  staffId: string | null;
  serviceId: string | null;
  name: string | null;
  contact: string | null;
  wantsReply: boolean;
}

export type SubmitResult = { ok: true; ref: string } | { ok: false; reason: "rate_limited" };

export async function submitFeedback(input: NewFeedback): Promise<SubmitResult> {
  const db = await getDb();
  const sender = await senderHash();
  const [{ n } = { n: 0 }] = await db
    .select({ n: count() })
    .from(feedback)
    .where(and(eq(feedback.senderHash, sender), gt(feedback.createdAt, new Date(Date.now() - 3600_000))));
  if (n >= MAX_PER_HOUR) return { ok: false, reason: "rate_limited" };

  for (let attempt = 0; attempt < 3; attempt++) {
    const ref = newRef();
    try {
      await db.insert(feedback).values({ ...input, ref, senderHash: sender });
      return { ok: true, ref };
    } catch (err) {
      if (attempt === 2) throw err; // ref collision is the only expected failure; retry with a new one
    }
  }
  throw new Error("Could not save feedback");
}

export async function listFeedback(filter: { status?: FeedbackStatus; kind?: FeedbackKind }): Promise<Feedback[]> {
  const db = await getDb();
  return db.query.feedback.findMany({
    where: and(
      filter.status ? eq(feedback.status, filter.status) : undefined,
      filter.kind ? eq(feedback.kind, filter.kind) : undefined,
    ),
    orderBy: [desc(feedback.createdAt)],
    limit: 200,
  });
}

export async function countNewFeedback(): Promise<number> {
  const db = await getDb();
  const [{ n } = { n: 0 }] = await db.select({ n: count() }).from(feedback).where(eq(feedback.status, "new"));
  return n;
}

export async function updateFeedback(id: string, patch: { status?: FeedbackStatus; ownerNote?: string | null }): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  const db = await getDb();
  await db
    .update(feedback)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(feedback.id, id));
}

/** POPIA: after the retention period, drop who sent feedback and how to reach them. The message stays. */
export async function removeExpiredFeedbackDetails(): Promise<void> {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - business.dataRetentionMonths);
  const db = await getDb();
  await db
    .update(feedback)
    .set({ name: null, contact: null, updatedAt: new Date() })
    .where(and(lt(feedback.createdAt, cutoff), or(isNotNull(feedback.name), isNotNull(feedback.contact))));
}
