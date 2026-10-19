import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { business, fullName, getStaff } from "@/config/business";
import { canCustomerCancel, getBookingByToken, hasEnded } from "@/lib/bookings";
import { directionsUrl, telLink, whatsappLink } from "@/lib/contact";
import { googleCalendarUrl } from "@/lib/ics";
import { formatDuration, makeFormatters } from "@/lib/time";
import { Icon } from "@/components/Icon";
import { Portrait } from "@/components/Portrait";
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
  const staff = getStaff(booking.staffId);
  const { phone, whatsapp } = business.contact;
  const waMessage = `Hi ${business.name}, I've just booked online: ${booking.serviceName} with ${booking.staffName} on ${when} (ref ${booking.ref}). Name: ${booking.customerName}.`;

  return (
    <div className={`wrap ${styles.page}`}>
      {isNew && !cancelled ? (
        <div className={styles.head}>
          <p className={styles.check} aria-hidden="true">
            <Icon name="check" size={30} />
          </p>
          <h1>You&apos;re booked!</h1>
          <p>
            We can&apos;t wait to see you. Save this page: it&apos;s your link to check or cancel the appointment.
          </p>
        </div>
      ) : (
        <div className={styles.head}>
          <h1>{cancelled ? "Appointment cancelled" : "Your appointment"}</h1>
          {cancelled && (
            <p>
              This appointment was cancelled{booking.cancelledBy === "owner" ? " by the salon" : ""}.{" "}
              <Link href={`/book?service=${booking.serviceId}&staff=${booking.staffId}`}>Book a new time</Link>.
            </p>
          )}
        </div>
      )}

      <section className={`glass ${styles.ticket}`} aria-label="Booking details">
        <div className={styles.when}>
          <p className={styles.date}>{fmt.dateLong(booking.startsAt)}</p>
          <p className={styles.time}>
            {fmt.time(booking.startsAt)} to {fmt.time(booking.endsAt)}
          </p>
        </div>
        <div className={styles.with}>
          {staff && <Portrait staff={staff} sizes="4.5rem" className={styles.withFace} />}
          <p>
            <span className="muted">With</span>
            <strong>{booking.staffName}</strong>
            {staff && <span className="muted">{staff.role}</span>}
          </p>
        </div>
        <dl className={styles.details}>
          <div>
            <dt>Service</dt>
            <dd>
              {booking.serviceName} (about {formatDuration(booking.durationMinutes)})
            </dd>
          </div>
          <div>
            <dt>Booked by</dt>
            <dd>
              {booking.customerName}
              {booking.clientType && <span className="muted"> for {booking.clientType === "child" ? "a child" : "an adult"}</span>}
            </dd>
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
            <dd>At the salon, on the day</dd>
          </div>
          <div>
            <dt>Where</dt>
            <dd>
              {fullName}, {business.address.lines[0]}{" "}
              <a href={directionsUrl()} target="_blank" rel="noopener noreferrer">
                Directions<span className="sr-only"> (opens Google Maps)</span>
              </a>
            </dd>
          </div>
        </dl>
      </section>

      {!cancelled && !past && (
        <section className={`${styles.block} no-print`} aria-labelledby="next">
          <h2 id="next" className={styles.blockTitle}>
            Keep it handy
          </h2>
          <div className={styles.actions}>
            {whatsapp && (
              <a className="btn btn-primary" href={whatsappLink(whatsapp, waMessage)}>
                <Icon name="whatsapp" size={18} /> Send to the salon on WhatsApp
              </a>
            )}
            <a className="btn btn-secondary" href={`/booking/${token}/calendar.ics`}>
              <Icon name="calendar" size={18} /> Apple or Outlook calendar
            </a>
            <a className="btn btn-secondary" href={googleCalendarUrl(customerEvent(booking))} target="_blank" rel="noopener noreferrer">
              Google Calendar<span className="sr-only"> (opens in a new tab)</span>
            </a>
            <PrintButton />
          </div>
        </section>
      )}

      {past && !cancelled && (
        <section className={`${styles.block} no-print`} aria-labelledby="how">
          <h2 id="how" className={styles.blockTitle}>
            How did it go?
          </h2>
          <p>We&apos;d love to hear what went well, and what we could do better.</p>
          <div className={styles.actions}>
            <Link className="btn btn-primary" href="/feedback?type=compliment">
              Leave a compliment
            </Link>
            <Link className="btn btn-secondary" href="/feedback?type=complaint">
              Tell us what went wrong
            </Link>
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
            <>
              <p>
                It&apos;s less than {Math.round(business.booking.cancelCutoffMinutes / 60)} hours to your appointment, so it can&apos;t be
                cancelled online. Please contact the salon directly.
              </p>
              <div className={styles.actions}>
                <a className="btn btn-secondary" href={telLink(phone)}>
                  <Icon name="phone" size={18} /> Call {phone}
                </a>
                {whatsapp && (
                  <a className="btn btn-secondary" href={whatsappLink(whatsapp, `Hi, about my booking ${booking.ref}`)}>
                    <Icon name="whatsapp" size={18} /> WhatsApp
                  </a>
                )}
              </div>
            </>
          )}
        </section>
      )}

      <p className={`muted no-print ${styles.feedbackLine}`}>
        Something not right with your booking? <Link href="/feedback?type=complaint">Let us know</Link>.
      </p>
    </div>
  );
}
