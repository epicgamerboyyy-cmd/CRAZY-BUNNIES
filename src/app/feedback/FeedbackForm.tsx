"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { sendFeedback, type FeedbackField, type FeedbackFormState } from "./actions";
import styles from "./feedback.module.css";

type Kind = "complaint" | "improvement" | "compliment";

const KINDS: { id: Kind; label: string; hint: string; icon: "close" | "sparkle" | "check" }[] = [
  { id: "complaint", label: "Something went wrong", hint: "A complaint about a visit or booking", icon: "close" },
  { id: "improvement", label: "An idea to improve", hint: "Something we could do better", icon: "sparkle" },
  { id: "compliment", label: "A compliment", hint: "Someone or something you loved", icon: "check" },
];

const PROMPTS: Record<Kind, string> = {
  complaint: "What happened, and what would put it right for you?",
  improvement: "What would make your visit better?",
  compliment: "What did you love? We'll pass it on to the team.",
};

const FIELD_LABELS: Record<FeedbackField, string> = {
  kind: "What it's about",
  message: "Your message",
  visitDate: "Date of visit",
  contact: "Phone or email",
};

interface Props {
  staff: { id: string; name: string }[];
  services: { id: string; name: string }[];
  today: string;
  initialKind: Kind | null;
}

export function FeedbackForm({ staff, services, today, initialKind }: Props) {
  const [state, action, pending] = useActionState<FeedbackFormState, FormData>(sendFeedback, {});
  const [kind, setKind] = useState<Kind | null>(initialKind);
  const [wantsReply, setWantsReply] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);
  const err = state.fieldErrors ?? {};
  const v = state.values ?? {};

  useEffect(() => {
    if (state.ok) doneRef.current?.focus();
    else if (state.fieldErrors?.kind) document.getElementById("fb-kind")?.focus();
    else formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state]);

  if (state.ok) {
    return (
      <div className={`glass ${styles.done}`} role="status">
        <span className={styles.doneIcon} aria-hidden="true">
          <Icon name="check" size={30} />
        </span>
        <h2 ref={doneRef} tabIndex={-1}>
          Thank you, we&apos;ve got it
        </h2>
        <p>
          Your reference is <strong className={styles.ref}>{state.ok.ref}</strong>. The salon owner reads every message.
          {state.ok.wantsReply
            ? " We'll get back to you on the number or email you gave."
            : " You didn't ask for a reply, so we won't contact you."}
        </p>
        <div className={styles.doneActions}>
          <Link href="/" className="btn btn-secondary">
            Back to the homepage
          </Link>
          <Link href="/book" className="btn btn-primary">
            Book an appointment
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form ref={formRef} action={action} className={`glass ${styles.form}`} noValidate>
      {state.formError && (
        <div className="notice notice-error" role="alert">
          <strong>{state.formError}</strong>
        </div>
      )}
      {Object.keys(err).length > 0 && (
        <div className="notice notice-error" role="alert">
          <strong>{Object.keys(err).length === 1 ? "One thing needs fixing:" : `${Object.keys(err).length} things need fixing:`}</strong>
          <ul className={styles.errorList}>
            {(Object.keys(FIELD_LABELS) as FeedbackField[])
              .filter((k) => err[k])
              .map((k) => (
                <li key={k}>
                  <a href={`#fb-${k}`}>{FIELD_LABELS[k]}</a>
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* Spam trap: hidden from people and screen readers */}
      <div className={styles.trap} aria-hidden="true">
        <label htmlFor="fb-website">Leave this empty</label>
        <input id="fb-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <fieldset className={styles.kinds} aria-describedby={err.kind ? "fb-kind-error" : undefined}>
        <legend className={styles.legend}>What&apos;s your message about?</legend>
        {KINDS.map((k, i) => (
          <label key={k.id} className={styles.kind}>
            <input
              id={i === 0 ? "fb-kind" : undefined}
              type="radio"
              name="kind"
              value={k.id}
              checked={(kind ?? v.kind) === k.id}
              onChange={() => setKind(k.id)}
            />
            <span className={styles.kindIcon} data-kind={k.id} aria-hidden="true">
              <Icon name={k.icon} size={20} />
            </span>
            <span className={styles.kindText}>
              <strong>{k.label}</strong>
              <span>{k.hint}</span>
            </span>
          </label>
        ))}
        {err.kind && (
          <p id="fb-kind-error" className="field-error">
            {err.kind}
          </p>
        )}
      </fieldset>

      <div className="field">
        <label htmlFor="fb-message">Your message</label>
        <textarea
          id="fb-message"
          name="message"
          className={`input ${styles.message}`}
          maxLength={2000}
          required
          placeholder={kind ? PROMPTS[kind] : "Tell us what's on your mind."}
          defaultValue={v.message}
          aria-invalid={!!err.message || undefined}
          aria-describedby={err.message ? "fb-message-error" : undefined}
        />
        {err.message && (
          <p id="fb-message-error" className="field-error">
            {err.message}
          </p>
        )}
      </div>

      <details className={styles.more} open={!!(v.visitDate || v.staffId || v.serviceId || err.visitDate)}>
        <summary>Add visit details (optional)</summary>
        <div className={styles.grid}>
          <div className="field">
            <label htmlFor="fb-visitDate">Date of visit</label>
            <input
              id="fb-visitDate"
              name="visitDate"
              type="date"
              max={today}
              className="input"
              defaultValue={v.visitDate}
              aria-invalid={!!err.visitDate || undefined}
              aria-describedby={err.visitDate ? "fb-visitDate-error" : undefined}
            />
            {err.visitDate && (
              <p id="fb-visitDate-error" className="field-error">
                {err.visitDate}
              </p>
            )}
          </div>
          <div className="field">
            <label htmlFor="fb-staff">Who helped you?</label>
            <select id="fb-staff" name="staffId" className="input" defaultValue={v.staffId ?? ""}>
              <option value="">Not sure, or rather not say</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="fb-service">Service</label>
            <select id="fb-service" name="serviceId" className="input" defaultValue={v.serviceId ?? ""}>
              <option value="">Not sure, or not about a service</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </details>

      <div className={styles.grid}>
        <div className="field">
          <label htmlFor="fb-name">
            Your name <span className="muted">(optional)</span>
          </label>
          <input id="fb-name" name="name" className="input" autoComplete="name" maxLength={80} defaultValue={v.name} />
          <span className="hint">Leave it empty to stay anonymous.</span>
        </div>
      </div>

      <label className={styles.check}>
        {/* Uncontrolled on purpose: React resets forms after each submit, and defaultChecked
            restores the box from what was sent, so it can't drift from the contact field. */}
        <input
          key={state.values?.wantsReply ?? "init"}
          type="checkbox"
          name="wantsReply"
          defaultChecked={v.wantsReply === "on"}
          onChange={(e) => setWantsReply(e.target.checked)}
        />
        I&apos;d like a reply
      </label>

      {wantsReply && (
        <div className="field">
          <label htmlFor="fb-contact">Phone or email</label>
          <input
            id="fb-contact"
            name="contact"
            className="input"
            autoComplete="tel"
            maxLength={120}
            defaultValue={v.contact}
            aria-invalid={!!err.contact || undefined}
            aria-describedby={err.contact ? "fb-contact-hint fb-contact-error" : "fb-contact-hint"}
          />
          <span id="fb-contact-hint" className="hint">
            Only used to reply to this message.
          </span>
          {err.contact && (
            <p id="fb-contact-error" className="field-error">
              {err.contact}
            </p>
          )}
        </div>
      )}

      <p className={styles.small}>
        Messages go straight to the salon owner, not to the stylist. See our <Link href="/privacy">privacy notice</Link>.
      </p>

      <button type="submit" className={`btn btn-primary ${styles.submit}`} disabled={pending}>
        {pending ? "Sending…" : "Send feedback"}
      </button>
    </form>
  );
}
