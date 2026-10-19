import type { Metadata } from "next";
import Link from "next/link";
import { business } from "@/config/business";
import { DatabaseNotConfiguredError } from "@/db";
import { requireAdmin } from "@/lib/auth";
import {
  isOpenOn,
  isUpcoming,
  listBookingsForDay,
  listUnsynced,
  listUpcomingBlocks,
  todayLocal,
  upcomingCounts,
} from "@/lib/bookings";
import { isCalendarConfigured } from "@/lib/gcal";
import { addDays, isDateString, makeFormatters } from "@/lib/time";
import { deleteBlock, logout, retryCalendarSync } from "./actions";
import { BlockForm } from "./BlockForm";
import { BookingActions } from "./BookingActions";
import styles from "./admin.module.css";

export const metadata: Metadata = { title: "Bookings", robots: { index: false, follow: false } };

const fmt = makeFormatters(business.locale, business.timezone);
const STATUS_LABEL = { confirmed: "Confirmed", completed: "Done", no_show: "No-show", cancelled: "Cancelled" } as const;

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  await requireAdmin();
  const { date: requested } = await searchParams;
  const today = todayLocal();
  const date = requested && isDateString(requested) ? requested : today;

  let data;
  try {
    const [bookings, counts, blocks, unsynced] = await Promise.all([
      listBookingsForDay(date),
      upcomingCounts(today, 7),
      listUpcomingBlocks(),
      isCalendarConfigured() ? listUnsynced() : Promise.resolve([]),
    ]);
    data = { bookings, counts, blocks, unsynced };
  } catch (err) {
    console.error("[admin]", err);
    return (
      <div className={`wrap ${styles.page}`}>
        <h1>Bookings</h1>
        <div className="notice notice-error" role="alert">
          <strong>
            {err instanceof DatabaseNotConfiguredError
              ? "The database isn't connected. Add the Neon integration on Vercel (it sets DATABASE_URL), then redeploy."
              : "Bookings couldn't be loaded. Refresh the page to try again."}
          </strong>
        </div>
      </div>
    );
  }

  const { bookings, counts, blocks, unsynced } = data;
  const active = bookings.filter((b) => b.status !== "cancelled");
  const strip = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const failedSync = unsynced.filter((b) => b.gcalError);

  return (
    <div className={`wrap ${styles.page}`}>
      <div className={styles.top}>
        <h1>Bookings</h1>
        <form action={logout}>
          <button type="submit" className="btn btn-secondary btn-small">
            Sign out
          </button>
        </form>
      </div>

      {business.isSample && (
        <div className="notice notice-warn" role="note">
          <strong>The site is still showing sample services and hours.</strong>
          Edit <code>src/config/business.ts</code> with the real details and set <code>isSample</code> to false.
        </div>
      )}
      {!isCalendarConfigured() && (
        <div className="notice" role="note">
          <strong>Google Calendar sync is off.</strong>
          Bookings are saved here. To also see them in Google Calendar, follow the setup steps in the README.
        </div>
      )}
      {failedSync.length > 0 && (
        <div className="notice notice-warn" role="note">
          <strong>
            {failedSync.length} upcoming booking{failedSync.length === 1 ? " isn't" : "s aren't"} in Google Calendar yet.
          </strong>
          Use &quot;Send to calendar&quot; on {failedSync.length === 1 ? "it" : "each one"} to try again.
        </div>
      )}

      <nav aria-label="Days" className={styles.strip}>
        {strip.map((d) => (
          <Link key={d} href={`/admin?date=${d}`} className={styles.stripDay} aria-current={d === date ? "date" : undefined}>
            <span>{d === today ? "Today" : fmt.calShortDay(d)}</span>
            <strong>{fmt.calDayNum(d)}</strong>
            <span className={styles.stripCount}>
              {isOpenOn(d) || counts[d] ? `${counts[d] ?? 0} booked` : "Closed"}
            </span>
          </Link>
        ))}
      </nav>

      <section aria-labelledby="day-title" className={styles.section}>
        <div className={styles.dayHead}>
          <h2 id="day-title">{fmt.calLong(date)}</h2>
          <div className={styles.dayNav}>
            <Link className="btn btn-secondary btn-small" href={`/admin?date=${addDays(date, -1)}`}>
              Previous day
            </Link>
            <Link className="btn btn-secondary btn-small" href={`/admin?date=${addDays(date, 1)}`}>
              Next day
            </Link>
            <form method="get" action="/admin" className={styles.jump}>
              <label htmlFor="jump" className="sr-only">
                Go to date
              </label>
              <input id="jump" type="date" name="date" defaultValue={date} className="input" />
              <button type="submit" className="btn btn-secondary btn-small">
                Go
              </button>
            </form>
          </div>
        </div>

        <p className="muted">
          {active.length
            ? `${active.length} appointment${active.length === 1 ? "" : "s"}`
            : isOpenOn(date)
              ? "No appointments yet."
              : "Closed this day."}
        </p>

        {bookings.length > 0 && (
          <ol className={styles.list}>
            {bookings.map((b) => (
              <li key={b.id} className={styles.row} data-status={b.status}>
                <div className={styles.rowTime}>
                  <strong>{fmt.time(b.startsAt)}</strong>
                  <span className="muted">to {fmt.time(b.endsAt)}</span>
                </div>
                <div className={styles.rowBody}>
                  <p className={styles.rowName}>
                    {b.customerName} <span className={`status status-${b.status}`}>{STATUS_LABEL[b.status]}</span>
                  </p>
                  <p>{b.serviceName}</p>
                  <p className={styles.rowMeta}>
                    <a href={`tel:${b.phone.replace(/[^\d+]/g, "")}`}>{b.phone}</a>
                    {b.email && <a href={`mailto:${b.email}`}>{b.email}</a>}
                    <span className="muted">Ref {b.ref}</span>
                  </p>
                  {b.notes && <p className={styles.notes}>{b.notes}</p>}
                  {b.gcalError && <p className="field-error">Calendar: {b.gcalError}</p>}
                </div>
                <div className={styles.rowActions}>
                  <BookingActions id={b.id} status={b.status} name={b.customerName} time={fmt.time(b.startsAt)} />
                  {isCalendarConfigured() && b.status === "confirmed" && !b.gcalEventId && isUpcoming(b) && (
                    <form action={retryCalendarSync}>
                      <input type="hidden" name="id" value={b.id} />
                      <button type="submit" className="btn btn-secondary btn-small">
                        Send to calendar
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="block-title" className={styles.section}>
        <h2 id="block-title">Block time off</h2>
        <p className="muted">Blocked time can&apos;t be booked online. Existing bookings stay as they are.</p>
        <BlockForm defaultDate={date} />

        {blocks.length > 0 && (
          <>
            <h3 className={styles.subhead}>Upcoming blocked time</h3>
            <ul className={styles.blocks}>
              {blocks.map((bl) => (
                <li key={bl.id}>
                  <span>
                    <strong>{fmt.dateLong(bl.startsAt)}</strong>, {fmt.time(bl.startsAt)} to{" "}
                    {bl.endsAt.getTime() - bl.startsAt.getTime() >= 86340000 ? "end of day" : fmt.time(bl.endsAt)}
                    {bl.reason && <span className="muted"> ({bl.reason})</span>}
                  </span>
                  <form action={deleteBlock}>
                    <input type="hidden" name="id" value={bl.id} />
                    <button type="submit" className="btn btn-secondary btn-small">
                      Remove<span className="sr-only"> block on {fmt.dateLong(bl.startsAt)}</span>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
