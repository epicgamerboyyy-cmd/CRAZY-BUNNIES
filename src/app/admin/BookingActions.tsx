"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import type { BookingStatus } from "@/db/schema";
import { updateStatus } from "./actions";
import styles from "./admin.module.css";

function Submit({ children, className }: { children: React.ReactNode; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? "Saving…" : children}
    </button>
  );
}

function StatusForm({ id, status, label, danger }: { id: string; status: BookingStatus; label: React.ReactNode; danger?: boolean }) {
  return (
    <form action={updateStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <Submit className={`btn btn-small ${danger ? "btn-danger" : "btn-secondary"}`}>{label}</Submit>
    </form>
  );
}

export function BookingActions({ id, status, name, time }: { id: string; status: BookingStatus; name: string; time: string }) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const who = <span className="sr-only"> for {name} at {time}</span>;

  if (status === "cancelled") return null;
  if (status !== "confirmed") {
    return <StatusForm id={id} status="confirmed" label={<>Undo{who}</>} />;
  }
  if (confirmCancel) {
    return (
      <div className={styles.confirmInline} role="group" aria-label={`Cancel ${name}'s booking?`}>
        <span>Cancel {name}&apos;s booking?</span>
        <StatusForm id={id} status="cancelled" label="Yes, cancel" danger />
        <button type="button" className="btn btn-secondary btn-small" onClick={() => setConfirmCancel(false)}>
          Keep
        </button>
      </div>
    );
  }
  return (
    <div className={styles.actionRow}>
      <StatusForm id={id} status="completed" label={<>Done{who}</>} />
      <StatusForm id={id} status="no_show" label={<>No-show{who}</>} />
      <button type="button" className="btn btn-danger btn-small" onClick={() => setConfirmCancel(true)}>
        Cancel{who}
      </button>
    </div>
  );
}
