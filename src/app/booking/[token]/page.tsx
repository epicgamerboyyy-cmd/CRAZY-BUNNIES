import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { business } from "@/config/business";
import { canCustomerCancel, getBookingByToken, hasEnded } from "@/lib/bookings";
import { whatsappLink } from "@/lib/contact";
import { googleCalendarUrl } from "@/lib/ics";
import { formatDuration, makeFormatters } from "@/lib/time";
import { CancelForm } from "./CancelForm";
import { PrintButton } from "./PrintButton";
import { customerEvent } from "./event";
import styles from "./manage.module.css";

export const metadata: Metadata = { title: "Your appointment", robots: { index: false, follow: false } };

const fmt = makeFormatters(business.locale, business.timezone);

export default async function ManageBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const [{ token }, { new: isNew }] = await Promise.all([params, searchParams]);
  const booking = await getBookingByToken(token);
  if (!booking) notFound();

  const cancelled = booking.status === "cancelled";
  const past = hasEnded(booking);
  const canCancel = canCustomerCancel(booking);
  const when = `${fmt.dateLong(booking.startsAt)} at ${fmt.time(booking.startsAt)}`;
  const { phone, whatsapp, email } = business.contact;
  const hasContact = !!(phone || whatsapp || email);

  return (
    <div className={`wrap ${styles.page}`}>
      {isNew && !cancelled ? (
        <div className={styles.head}>
          <p className={styles.check} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </p>
          <h1>You&apos;re booked</h1>
          <p>
            Save this page. It&apos;s your link to check or cancel the appointment, so bookmark it or add the appointment to your
            calendar below.
          </p>
        </div>
      ) : (
        <div className={styles.head}>
          <h1>{cancelled ? "Appointment cancelled" : "Your appointment"}</h1>
          {cancelled && (
            <p>
              This appointment was cancelled{booking.cancelledBy === "owner" ? ` by ${business.name}` : ""}.{" "}
              <Link href={`/book?service=${booking.serviceId}`}>Book a new time</Link>.
            </p>
          )}
        </div>
      )}

      <section className={styles.ticket} aria-label="Booking details">
        <p className={styles.when}>
          <span className={styles.date}>{fmt.dateLong(booking.startsAt)}</span>
          <span className={styles.time}>
            {fmt.time(booking.startsAt)} to {fmt.time(booking.endsAt)}
          </span>
        </p>
        <dl className={styles.details}>
          <div>
            <dt>Service</dt>
            <dd>
              {booking.serviceName} ({formatDuration(booking.durationMinutes)})
            </dd>
          </div>
          <div>
            <dt>Name</dt>
            <dd>{booking.customerName}</dd>
          </div>
          <div>
            <dt>Reference</dt>
            <dd className={styles.ref}>{booking.ref}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              <span className={`status status-${booking.status}`}>
                {{ confirmed: "Confirmed", completed: "Completed", no_show: "Missed", cancelled: "Cancelled" }[booking.status]}
              </span>
            </dd>
          </div>
          <div>
            <dt>Payment</dt>
            <dd>In person, at your appointment</dd>
          </div>
          {business.address && (
            <div>
              <dt>Where</dt>
              <dd>
                {business.address.lines.join(", ")}
                {business.address.mapUrl && (
                  <>
                    {" "}
                    <a href={business.address.mapUrl}>Open in maps</a>
                  </>
                )}
              </dd>
            </div>
          )}
        </dl>
      </section>

      {!cancelled && !past && (
        <section className={`${styles.block} no-print`} aria-labelledby="add-cal">
          <h2 id="add-cal" className={styles.blockTitle}>
            Add to your calendar
          </h2>
          <div className={styles.actions}>
            <a className="btn btn-secondary" href={`/booking/${token}/calendar.ics`}>
              Apple or Outlook (.ics)
            </a>
            <a className="btn btn-secondary" href={googleCalendarUrl(customerEvent(booking))} target="_blank" rel="noopener noreferrer">
              Google Calendar<span className="sr-only"> (opens in a new tab)</span>
            </a>
            <PrintButton />
          </div>
        </section>
      )}

      {!cancelled && !past && (
        <section className={`${styles.block} no-print`} aria-labelledby="change">
          <h2 id="change" className={styles.blockTitle}>
            Need to change it?
          </h2>
          {canCancel ? (
            <>
              <p>Cancel here, then book a new time.</p>
              <CancelForm token={token} when={when} />
            </>
          ) : (
            <p>
              It&apos;s less than {Math.round(business.booking.cancelCutoffMinutes / 60)} hours to your appointment, so it can&apos;t be
              cancelled online.{" "}
              {hasContact ? "Please contact us directly:" : "Please contact us directly."}
            </p>
          )}
          {hasContact && !canCancel && (
            <ul className={styles.contactList}>
              {phone && (
                <li>
                  <a href={`tel:${phone.replace(/\s/g, "")}`}>Call {phone}</a>
                </li>
              )}
              {whatsapp && (
                <li>
                  <a href={whatsappLink(whatsapp, `Hi, about my booking ${booking.ref}`)}>WhatsApp us</a>
                </li>
              )}
              {email && (
                <li>
                  <a href={`mailto:${email}?subject=${encodeURIComponent(`Booking ${booking.ref}`)}`}>{email}</a>
                </li>
              )}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
