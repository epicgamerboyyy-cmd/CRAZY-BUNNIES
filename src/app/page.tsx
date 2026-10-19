import Link from "next/link";
import { connection } from "next/server";
import { business, type Weekday } from "@/config/business";
import { getAvailability, todayLocal } from "@/lib/bookings";
import { whatsappLink } from "@/lib/contact";
import { formatZar } from "@/lib/money";
import { formatDuration, localDate, makeFormatters, weekdayOf } from "@/lib/time";
import styles from "./home.module.css";

const fmt = makeFormatters(business.locale, business.timezone);
const DAY_NAMES: Record<Weekday, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};
const ORDER: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

async function nextOpenTimes(serviceId: string, limit: number): Promise<string[] | null> {
  try {
    const days = await getAvailability(serviceId, todayLocal(), 14);
    return days.flatMap((d) => d.slots).slice(0, limit);
  } catch (err) {
    console.error("[home] availability", err);
    return null;
  }
}

export default async function HomePage() {
  // Open times change constantly, so this page is rendered per request.
  await connection();
  const firstService = business.services[0];
  const times = firstService ? await nextOpenTimes(firstService.id, 6) : null;
  const today = todayLocal();
  const todayKey = weekdayOf(today);
  const { phone, whatsapp, email } = business.contact;
  const hasVisitInfo = !!(business.address || phone || whatsapp || email);

  return (
    <>
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={`wrap ${styles.heroGrid}`}>
          <div className={styles.heroText}>
            <h1 id="hero-title" className={styles.heroTitle}>
              {business.name}
            </h1>
            <p className={styles.lede}>{business.summary}</p>
            <div className={styles.heroActions}>
              <Link href="/book" className="btn btn-primary">
                Book an appointment
              </Link>
              <Link href="#services" className="btn btn-secondary">
                See services
              </Link>
            </div>
          </div>

          {firstService && (
            <div className={styles.board} aria-labelledby="next-title">
              <h2 id="next-title" className={styles.boardTitle}>
                Next open times
              </h2>
              <p className={styles.boardSub}>
                {firstService.name}, {formatDuration(firstService.durationMinutes)}
              </p>
              {times === null ? (
                <p className={styles.boardEmpty}>Open times will show here once online booking is switched on.</p>
              ) : times.length === 0 ? (
                <p className={styles.boardEmpty}>Nothing open in the next two weeks. Check the booking page for later dates.</p>
              ) : (
                <ul className={styles.boardList}>
                  {times.map((t) => {
                    const d = localDate(Date.parse(t), business.timezone);
                    return (
                      <li key={t}>
                        <Link href={`/book?service=${firstService.id}&slot=${encodeURIComponent(t)}`} className={styles.boardSlot}>
                          <span>{d === today ? "Today" : fmt.calShortDay(d) + " " + fmt.calDayNum(d) + " " + fmt.calMonth(d)}</span>
                          <strong>{fmt.time(new Date(t))}</strong>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
              <Link href="/book" className={styles.boardMore}>
                All services and times
              </Link>
            </div>
          )}
        </div>
      </section>

      <section id="services" className={`wrap ${styles.section}`} aria-labelledby="services-title">
        <h2 id="services-title">Services</h2>
        <ul className={styles.services}>
          {business.services.map((s) => (
            <li key={s.id} className={styles.service}>
              <div className={styles.serviceMain}>
                <h3>{s.name}</h3>
                <p className="muted">{s.description}</p>
              </div>
              <p className={styles.serviceMeta}>
                <span>{formatDuration(s.durationMinutes)}</span>
                {s.priceZar !== null && <span className={styles.price}>{formatZar(s.priceZar, business.locale)}</span>}
              </p>
              <Link href={`/book?service=${s.id}`} className="btn btn-secondary btn-small">
                Book<span className="sr-only"> {s.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className={`wrap ${styles.section}`} aria-labelledby="how-title">
        <h2 id="how-title">How booking works</h2>
        <ol className={styles.steps}>
          <li>
            <h3>Pick a service and a time</h3>
            <p className="muted">Only times that are actually free are shown.</p>
          </li>
          <li>
            <h3>Leave your name and number</h3>
            <p className="muted">No account, no card details. You get a link to manage the booking.</p>
          </li>
          <li>
            <h3>Arrive and pay in person</h3>
            <p className="muted">
              Plans change? Cancel online up to {Math.round(business.booking.cancelCutoffMinutes / 60)} hours before.
            </p>
          </li>
        </ol>
      </section>

      <section id="hours" className={`wrap ${styles.section} ${styles.split}`} aria-labelledby="hours-title">
        <div>
          <h2 id="hours-title">Opening hours</h2>
          <table className={styles.hours}>
            <caption className="sr-only">Opening hours by day</caption>
            <tbody>
              {ORDER.map((day) => {
                const windows = business.hours[day];
                const isToday = day === todayKey;
                return (
                  <tr key={day} aria-current={isToday ? "date" : undefined} className={isToday ? styles.today : undefined}>
                    <th scope="row">
                      {DAY_NAMES[day]}
                      {isToday && <span className={styles.todayTag}> today</span>}
                    </th>
                    <td>{windows.length ? windows.map(([o, c]) => `${o} to ${c}`).join(", ") : "Closed"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {hasVisitInfo && (
          <div aria-labelledby="visit-title">
            <h2 id="visit-title">Find us</h2>
            <address className={styles.address}>
              {business.address?.lines.map((l) => (
                <span key={l}>{l}</span>
              ))}
            </address>
            <ul className={styles.contact}>
              {business.address?.mapUrl && (
                <li>
                  <a href={business.address.mapUrl}>Open in maps</a>
                </li>
              )}
              {phone && (
                <li>
                  <a href={`tel:${phone.replace(/\s/g, "")}`}>Call {phone}</a>
                </li>
              )}
              {whatsapp && (
                <li>
                  <a href={whatsappLink(whatsapp)}>WhatsApp us</a>
                </li>
              )}
              {email && (
                <li>
                  <a href={`mailto:${email}`}>{email}</a>
                </li>
              )}
            </ul>
          </div>
        )}
      </section>
    </>
  );
}
