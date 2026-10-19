"use client";

import { useActionState, useState } from "react";
import { cancelOwnBooking, type CancelState } from "./actions";
import styles from "./manage.module.css";

export function CancelForm({ token, when }: { token: string; when: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState<CancelState, FormData>(cancelOwnBooking, {});

  if (!confirming) {
    return (
      <button type="button" className="btn btn-danger" onClick={() => setConfirming(true)}>
        Cancel this appointment
      </button>
    );
  }

  return (
    <form action={action} className={styles.confirmBox}>
      <input type="hidden" name="token" value={token} />
      <p>
        <strong>Cancel your appointment on {when}?</strong> The time will be released for someone else.
      </p>
      {state.error && (
        <p className="field-error" role="alert">
          {state.error}
        </p>
      )}
      <div className={styles.actions}>
        <button type="submit" className="btn btn-danger" disabled={pending} autoFocus>
          {pending ? "Cancelling…" : "Yes, cancel it"}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => setConfirming(false)} disabled={pending}>
          Keep my appointment
        </button>
      </div>
    </form>
  );
}
