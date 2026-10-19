import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <div className="wrap" style={{ paddingBlock: "var(--s8)", display: "grid", gap: "var(--s4)", maxWidth: "40rem" }}>
      <h1 style={{ fontSize: "var(--t-xl)" }}>This page doesn&apos;t exist</h1>
      <p>
        The link may be mistyped or out of date. If you were looking for a booking, use the link from when you booked, or
        book again.
      </p>
      <div style={{ display: "flex", gap: "var(--s3)", flexWrap: "wrap" }}>
        <Link href="/book" className="btn btn-primary">
          Book an appointment
        </Link>
        <Link href="/" className="btn btn-secondary">
          Go to the homepage
        </Link>
      </div>
    </div>
  );
}
