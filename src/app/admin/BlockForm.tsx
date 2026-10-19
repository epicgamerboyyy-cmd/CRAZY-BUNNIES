"use client";

import { useActionState, useState } from "react";
import { createBlock, type BlockState } from "./actions";
import styles from "./admin.module.css";

export function BlockForm({
  defaultDate,
  defaultStaff,
  staff,
}: {
  defaultDate: string;
  defaultStaff: string;
  staff: { id: string; name: string }[];
}) {
  const [allDay, setAllDay] = useState(false);
  const [state, action, pending] = useActionState<BlockState, FormData>(async (prev, formData) => {
    const next = await createBlock(prev, formData);
    // React resets the form after every action, so keep the toggle in step with it.
    setAllDay(false);
    return next;
  }, {});

  return (
    <form action={action} className={styles.blockForm}>
      <div className="field">
        <label htmlFor="block-date">Date</label>
        <input id="block-date" name="date" type="date" className="input" defaultValue={defaultDate} required />
      </div>
      <div className="field">
        <label htmlFor="block-staff">Who</label>
        <select id="block-staff" name="staffId" className="input" defaultValue={defaultStaff}>
          <option value="">Whole salon (nobody can be booked)</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <label className={styles.check}>
        <input type="checkbox" name="allDay" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
        Whole day
      </label>
      {!allDay && (
        <div className={styles.timePair}>
          <div className="field">
            <label htmlFor="block-start">From</label>
            <input id="block-start" name="start" type="time" className="input" step={300} required />
          </div>
          <div className="field">
            <label htmlFor="block-end">To</label>
            <input id="block-end" name="end" type="time" className="input" step={300} required />
          </div>
        </div>
      )}
      <div className="field">
        <label htmlFor="block-reason">
          Note <span className="muted">(optional, only you see it)</span>
        </label>
        <input id="block-reason" name="reason" className="input" maxLength={120} />
      </div>
      <div aria-live="polite" className={styles.formStatus}>
        {state.error && <p className="field-error">{state.error}</p>}
        {state.success && <p className="notice notice-ok">{state.success}</p>}
        {state.warning && <p className="notice notice-warn">{state.warning}</p>}
      </div>
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Blocking…" : "Block this time"}
      </button>
    </form>
  );
}
