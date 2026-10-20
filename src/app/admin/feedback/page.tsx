import type { Metadata } from "next";
import Link from "next/link";
import { business, getService, getStaff } from "@/config/business";
import { DatabaseNotConfiguredError } from "@/db";
import { FEEDBACK_KINDS, FEEDBACK_STATUSES, type FeedbackKind, type FeedbackStatus } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { telLink } from "@/lib/contact";
import { countNewFeedback, listFeedback } from "@/lib/feedback";
import { makeFormatters } from "@/lib/time";
import { saveFeedbackNote, setFeedbackStatus } from "../actions";
import { AdminNav } from "../AdminNav";
import styles from "../admin.module.css";
import { logError } from "@/lib/request";

export const metadata: Metadata = { title: "Feedback", robots: { index: false, follow: false } };

const fmt = makeFormatters(business.locale, business.timezone);
const KIND_LABEL: Record<FeedbackKind, string> = { complaint: "Complaint", improvement: "Improvement", compliment: "Compliment" };
const STATUS_LABEL: Record<FeedbackStatus, string> = { new: "New", in_progress: "Being handled", resolved: "Resolved" };
const NEXT_ACTIONS: Record<FeedbackStatus, { status: FeedbackStatus; label: string }[]> = {
  new: [
    { status: "in_progress", label: "Mark as being handled" },
    { status: "resolved", label: "Mark resolved" },
  ],
  in_progress: [{ status: "resolved", label: "Mark resolved" }],
  resolved: [{ status: "in_progress", label: "Reopen" }],
};

export default async function FeedbackInbox({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; kind?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const status = FEEDBACK_STATUSES.includes(sp.status as FeedbackStatus) ? (sp.status as FeedbackStatus) : undefined;
  const kind = FEEDBACK_KINDS.includes(sp.kind as FeedbackKind) ? (sp.kind as FeedbackKind) : undefined;
  // Default view: everything still open, oldest concerns don't get buried.
  const showOpen = !sp.status;

  let items, newCount;
  try {
    [items, newCount] = await Promise.all([listFeedback({ status, kind }), countNewFeedback()]);
  } catch (err) {
    logError("admin feedback", err);
    return (
      <div className={`wrap ${styles.page}`}>
        <h1>Feedback</h1>
        <div className="notice notice-error" role="alert">
          <strong>
            {err instanceof DatabaseNotConfiguredError
              ? "The database isn't connected. Add the Neon integration on Vercel, then redeploy."
              : "Feedback couldn't be loaded. Refresh the page to try again."}
          </strong>
        </div>
      </div>
    );
  }
  const visible = showOpen ? items.filter((f) => f.status !== "resolved") : items;
  const href = (p: { status?: string; kind?: string }) => {
    const q = new URLSearchParams();
    const s = "status" in p ? p.status : sp.status;
    const k = "kind" in p ? p.kind : kind;
    if (s) q.set("status", s);
    if (k) q.set("kind", k);
    const qs = q.toString();
    return `/admin/feedback${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className={`wrap ${styles.page}`}>
      <AdminNav current="feedback" newFeedback={newCount} />
      <h1>Feedback</h1>

      <div className={styles.filterRow}>
        <nav aria-label="Status" className={styles.pills}>
          <Link href={href({ status: undefined })} aria-current={showOpen ? "true" : undefined}>
            Open
          </Link>
          {FEEDBACK_STATUSES.map((s) => (
            <Link key={s} href={href({ status: s })} aria-current={status === s ? "true" : undefined}>
              {STATUS_LABEL[s]}
            </Link>
          ))}
          <Link href={href({ status: "all" })} aria-current={sp.status === "all" ? "true" : undefined}>
            All
          </Link>
        </nav>
        <nav aria-label="Type" className={styles.pills}>
          <Link href={href({ kind: undefined })} aria-current={!kind ? "true" : undefined}>
            Every type
          </Link>
          {FEEDBACK_KINDS.map((k) => (
            <Link key={k} href={href({ kind: k })} aria-current={kind === k ? "true" : undefined}>
              {KIND_LABEL[k]}s
            </Link>
          ))}
        </nav>
      </div>

      {visible.length === 0 ? (
        <p className="muted">
          {showOpen ? "Nothing waiting. Every message has been dealt with." : "No feedback matches these filters."}
        </p>
      ) : (
        <ol className={styles.list}>
          {visible.map((f) => {
            const staff = f.staffId ? getStaff(f.staffId) : null;
            const service = f.serviceId ? getService(f.serviceId) : null;
            const isEmail = f.contact?.includes("@");
            return (
              <li key={f.id} className={`${styles.fbItem} ${styles[`kind_${f.kind}`]}`}>
                <div className={styles.fbHead}>
                  <span className={`${styles.kindTag} ${styles[`kindTag_${f.kind}`]}`}>{KIND_LABEL[f.kind]}</span>
                  <span className={`${styles.fbStatus} ${styles[`fbStatus_${f.status}`]}`}>{STATUS_LABEL[f.status]}</span>
                  <span className="muted">
                    {fmt.dateLong(f.createdAt)}, {fmt.time(f.createdAt)}
                  </span>
                  <span className={styles.fbRef}>{f.ref}</span>
                </div>
                <p className={styles.fbMessage}>{f.message}</p>
                <dl className={styles.fbMeta}>
                  <div>
                    <dt>From</dt>
                    <dd>{f.name ?? "Anonymous"}</dd>
                  </div>
                  {f.visitDate && (
                    <div>
                      <dt>Visit</dt>
                      <dd>{fmt.calLong(f.visitDate)}</dd>
                    </div>
                  )}
                  {staff && (
                    <div>
                      <dt>Stylist</dt>
                      <dd>{staff.name}</dd>
                    </div>
                  )}
                  {service && (
                    <div>
                      <dt>Service</dt>
                      <dd>{service.name}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Reply</dt>
                    <dd>
                      {f.wantsReply && f.contact ? (
                        <a href={isEmail ? `mailto:${f.contact}?subject=${encodeURIComponent(`Your feedback ${f.ref}`)}` : telLink(f.contact)}>
                          {f.contact}
                        </a>
                      ) : (
                        "Not requested"
                      )}
                    </dd>
                  </div>
                </dl>
                <div className={styles.fbActions}>
                  {NEXT_ACTIONS[f.status].map((a) => (
                    <form key={a.status} action={setFeedbackStatus}>
                      <input type="hidden" name="id" value={f.id} />
                      <input type="hidden" name="status" value={a.status} />
                      <button type="submit" className={`btn btn-small ${a.status === "resolved" ? "btn-primary" : "btn-secondary"}`}>
                        {a.label}
                        <span className="sr-only"> ({f.ref})</span>
                      </button>
                    </form>
                  ))}
                </div>
                <form action={saveFeedbackNote} className={styles.noteForm}>
                  <input type="hidden" name="id" value={f.id} />
                  <label htmlFor={`note-${f.id}`} className="label">
                    Private note <span className="muted">(only you see this)</span>
                  </label>
                  <div className={styles.noteRow}>
                    <input
                      id={`note-${f.id}`}
                      name="note"
                      className="input"
                      maxLength={1000}
                      defaultValue={f.ownerNote ?? ""}
                      placeholder="e.g. Called back, offered a free touch-up"
                    />
                    <button type="submit" className="btn btn-secondary btn-small">
                      Save note
                    </button>
                  </div>
                </form>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
