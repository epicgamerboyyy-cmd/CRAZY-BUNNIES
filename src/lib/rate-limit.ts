import "server-only";
import { and, count, eq, gt, lt } from "drizzle-orm";
import { getDb, schema } from "@/db";

const { authAttempts: hits } = schema;

/** How many hits a key has had in the last `minutes`. */
export async function hitsSince(key: string, minutes: number): Promise<number> {
  const db = await getDb();
  const [{ n } = { n: 0 }] = await db
    .select({ n: count() })
    .from(hits)
    .where(and(eq(hits.key, key), gt(hits.at, new Date(Date.now() - minutes * 60000))));
  return Number(n);
}

export async function recordHit(key: string): Promise<void> {
  const db = await getDb();
  await db.insert(hits).values({ key });
  // Opportunistic cleanup so the table stays tiny.
  await db.delete(hits).where(lt(hits.at, new Date(Date.now() - 86400000)));
}
