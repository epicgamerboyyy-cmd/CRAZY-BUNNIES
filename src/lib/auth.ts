import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { clientHash } from "@/lib/request";

// __Host- makes the browser refuse the cookie unless it's Secure, host-only and path=/.
const COOKIE = process.env.NODE_ENV === "production" ? "__Host-cb_admin" : "cb_admin";
const SESSION_HOURS = 12;
const MAX_ATTEMPTS = 5;
// Across every IP at once, so guessing from many machines doesn't get around the per-IP limit.
const MAX_ATTEMPTS_ALL = 30;
const WINDOW_MINUTES = 15;
const MIN_PASSWORD_LENGTH = 12;
const ALL_KEY = "login:all";

export function adminConfigError(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return "ADMIN_PASSWORD is not set.";
  if (password.length < MIN_PASSWORD_LENGTH) return `ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  if ((process.env.SESSION_SECRET ?? "").length < 32) return "SESSION_SECRET must be at least 32 characters.";
  return null;
}

const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET);
const digest = (s: string) => createHash("sha256").update(s).digest();

/** Changes whenever the password changes, so a new password signs out every existing session. */
const passwordVersion = () =>
  createHash("sha256").update(`${process.env.SESSION_SECRET}:${process.env.ADMIN_PASSWORD}`).digest("hex").slice(0, 16);

export function passwordMatches(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return timingSafeEqual(digest(input), digest(expected));
}

// Hashed, so the attempts table never holds anyone's IP address.
const clientKey = async () => `login:${await clientHash("login")}`;

/** Returns minutes until the next attempt is allowed, or 0 if allowed now. */
export async function loginLockedFor(): Promise<number> {
  const db = await getDb();
  const since = new Date(Date.now() - WINDOW_MINUTES * 60000);
  const minutesLeft = async (key: string, max: number) => {
    const rows = await db
      .select({ at: schema.authAttempts.at })
      .from(schema.authAttempts)
      .where(and(eq(schema.authAttempts.key, key), gt(schema.authAttempts.at, since)));
    if (rows.length < max) return 0;
    const oldest = Math.min(...rows.map((r) => r.at.getTime()));
    return Math.max(1, Math.ceil((oldest + WINDOW_MINUTES * 60000 - Date.now()) / 60000));
  };
  return Math.max(await minutesLeft(await clientKey(), MAX_ATTEMPTS), await minutesLeft(ALL_KEY, MAX_ATTEMPTS_ALL));
}

export async function recordFailedLogin(): Promise<void> {
  const db = await getDb();
  await db.insert(schema.authAttempts).values([{ key: await clientKey() }, { key: ALL_KEY }]);
  // Opportunistic cleanup so the table stays tiny.
  await db.delete(schema.authAttempts).where(lt(schema.authAttempts.at, new Date(Date.now() - 86400000)));
}

export async function clearFailedLogins(): Promise<void> {
  const db = await getDb();
  await db.delete(schema.authAttempts).where(eq(schema.authAttempts.key, await clientKey()));
}

export async function startSession(): Promise<void> {
  const token = await new SignJWT({ role: "owner", pv: passwordVersion() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  // Read cookies first so pages using this are always rendered per request.
  const token = (await cookies()).get(COOKIE)?.value;
  if (adminConfigError()) return false;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    return payload.role === "owner" && payload.pv === passwordVersion();
  } catch {
    return false;
  }
}

/** Call at the top of every admin page and server action. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}
