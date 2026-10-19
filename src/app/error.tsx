"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="wrap" style={{ paddingBlock: "var(--s8)", display: "grid", gap: "var(--s4)", maxWidth: "40rem" }}>
      <h1 style={{ fontSize: "var(--t-xl)" }}>This page didn&apos;t load</h1>
      <p>Something went wrong on our side. Try again, and if it keeps happening, contact us directly.</p>
      <div>
        <button type="button" className="btn btn-primary" onClick={reset}>
          Try again
        </button>
      </div>
    </div>
  );
}
