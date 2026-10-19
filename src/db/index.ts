import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

export type Db = ReturnType<typeof drizzleNeon<typeof schema>>;

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_URL is not set. Add the Neon integration on Vercel or set DATABASE_URL.");
    this.name = "DatabaseNotConfiguredError";
  }
}

const globalForDb = globalThis as unknown as { __cbDb?: Promise<Db> };

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  let db: Db;
  if (url) {
    db = drizzleNeon(neon(url), { schema });
  } else if (process.env.NODE_ENV === "production" && process.env.VERCEL) {
    // An embedded DB on serverless would silently lose bookings. Fail loudly instead.
    throw new DatabaseNotConfiguredError();
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const { btree_gist } = await import("@electric-sql/pglite/contrib/btree_gist");
    const { drizzle } = await import("drizzle-orm/pglite");
    const dir = process.env.PGLITE_DIR ?? ".data/pglite";
    (await import("node:fs")).mkdirSync(dir, { recursive: true });
    // Same query API as the neon driver for everything this app uses.
    db = drizzle(new PGlite(dir, { extensions: { btree_gist } }), { schema }) as unknown as Db;
  }
  for (const statement of schema.SCHEMA_SQL) await db.execute(sql.raw(statement));
  return db;
}

export function getDb(): Promise<Db> {
  if (!globalForDb.__cbDb) {
    globalForDb.__cbDb = connect().catch((err) => {
      globalForDb.__cbDb = undefined;
      throw err;
    });
  }
  return globalForDb.__cbDb;
}

export { schema };
