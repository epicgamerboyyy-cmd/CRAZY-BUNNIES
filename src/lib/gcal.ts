import "server-only";
import { importPKCS8, SignJWT } from "jose";
import type { Interval } from "@/lib/slots";

/**
 * Google Calendar sync through a service account. The owner shares their calendar
 * with the service account's email ("Make changes to events"). Every function is a
 * no-op when the env vars aren't set, so the rest of the app never depends on it.
 */

const SCOPE = "https://www.googleapis.com/auth/calendar";
const API = "https://www.googleapis.com/calendar/v3";

function config() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!email || !key || !calendarId) return null;
  return {
    email,
    key: key.replace(/\\n/g, "\n"),
    calendarId,
    blocksAvailability: process.env.GOOGLE_CALENDAR_BLOCKS_AVAILABILITY !== "false",
  };
}

export const isCalendarConfigured = () => config() !== null;

let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(cfg: NonNullable<ReturnType<typeof config>>): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const key = await importPKCS8(cfg.key, "RS256");
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({ scope: SCOPE })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(cfg.email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Google auth failed (${res.status})`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T | null> {
  const cfg = config();
  if (!cfg) return null;
  const token = await accessToken(cfg);
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...init.headers },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  // Deleting an event that's already gone is fine.
  if (init.method === "DELETE" && (res.status === 404 || res.status === 410)) return null;
  if (!res.ok) throw new Error(`Google Calendar ${init.method ?? "GET"} ${path.split("?")[0]} failed (${res.status})`);
  return res.status === 204 ? null : ((await res.json()) as T);
}

const calPath = (calendarId: string) => `/calendars/${encodeURIComponent(calendarId)}`;

export async function calendarBusy(from: number, to: number): Promise<Interval[]> {
  const cfg = config();
  if (!cfg?.blocksAvailability) return [];
  const json = await call<{ calendars: Record<string, { busy: { start: string; end: string }[] }> }>("/freeBusy", {
    method: "POST",
    body: JSON.stringify({
      timeMin: new Date(from).toISOString(),
      timeMax: new Date(to).toISOString(),
      items: [{ id: cfg.calendarId }],
    }),
  });
  const busy = json?.calendars[cfg.calendarId]?.busy ?? [];
  return busy.map((b) => ({ start: Date.parse(b.start), end: Date.parse(b.end) }));
}

export interface CalendarEventInput {
  summary: string;
  description: string;
  start: Date;
  end: Date;
  timezone: string;
  /** Stored on the event so it can be traced back to the booking. */
  bookingId: string;
}

export async function createCalendarEvent(e: CalendarEventInput): Promise<string | null> {
  const cfg = config();
  if (!cfg) return null;
  const json = await call<{ id: string }>(`${calPath(cfg.calendarId)}/events`, {
    method: "POST",
    body: JSON.stringify({
      summary: e.summary,
      description: e.description,
      start: { dateTime: e.start.toISOString(), timeZone: e.timezone },
      end: { dateTime: e.end.toISOString(), timeZone: e.timezone },
      extendedProperties: { private: { cbBookingId: e.bookingId } },
      reminders: { useDefault: true },
    }),
  });
  return json?.id ?? null;
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const cfg = config();
  if (!cfg) return;
  await call(`${calPath(cfg.calendarId)}/events/${encodeURIComponent(eventId)}`, { method: "DELETE" });
}
