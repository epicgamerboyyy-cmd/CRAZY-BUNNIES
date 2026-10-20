import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";

/**
 * The visitor's IP. Vercel sets x-real-ip itself and overwrites x-forwarded-for,
 * so a client can't fake either there. Locally both may be missing.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-real-ip")?.trim() || h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/** A salted hash of the visitor's IP, for rate limits. The IP itself is never stored. */
export async function clientHash(purpose: string): Promise<string> {
  return createHash("sha256")
    .update(`${process.env.SESSION_SECRET ?? "cb"}:${purpose}:${await clientIp()}`)
    .digest("hex")
    .slice(0, 32);
}

/**
 * Log a failure without personal data. Database driver errors embed the query
 * parameters (names, phone numbers) in their message, so those are cut off.
 */
export function logError(scope: string, err: unknown): void {
  const e = err as { name?: string; message?: string; code?: string; cause?: { code?: string; message?: string } };
  const strip = (m?: string) => (m ?? "").split(/\nparams:|params:/i)[0]!.slice(0, 300);
  console.error(`[${scope}]`, {
    name: e?.name ?? typeof err,
    code: e?.code ?? e?.cause?.code,
    message: strip(e?.message),
    cause: e?.cause?.message ? strip(e.cause.message) : undefined,
  });
}
