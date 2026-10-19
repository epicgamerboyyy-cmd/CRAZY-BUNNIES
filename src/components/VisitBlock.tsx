import { business } from "@/config/business";
import { directionsUrl, instagramUrl, mapEmbedUrl, mapUrl, telLink, whatsappLink } from "@/lib/contact";
import { DAY_NAMES, openStatus, WEEK_ORDER } from "@/lib/hours";
import { localDate, weekdayOf } from "@/lib/time";
import { Icon } from "./Icon";
import styles from "./visit.module.css";

/** Address, open-now status, hours, map and contact. Render per request so "open now" is current. */
export function VisitBlock({ now, headingLevel = 2 }: { now: number; headingLevel?: 2 | 3 }) {
  const H = `h${headingLevel}` as "h2" | "h3";
  const status = openStatus(business.hours, business.closedDates, now, business.timezone);
  const todayKey = weekdayOf(localDate(now, business.timezone));
  const { phone, whatsapp, instagram, facebook } = business.contact;

  return (
    <div className={styles.grid}>
      <div className={`card ${styles.panel}`}>
        <p className={`${styles.status} ${status.open ? styles.open : styles.closed}`}>
          <span className={styles.dot} aria-hidden="true" />
          {status.text}
        </p>

        <div className={styles.row}>
          <Icon name="pin" />
          <div>
            <H className={styles.h}>Find us</H>
            <address className={styles.address}>
              {business.address.lines.map((l) => (
                <span key={l}>{l}</span>
              ))}
            </address>
            <div className={styles.buttons}>
              <a className="btn btn-mint btn-small" href={directionsUrl()} target="_blank" rel="noopener noreferrer">
                Directions<span className="sr-only"> (opens Google Maps)</span>
              </a>
              <a className="btn btn-secondary btn-small" href={mapUrl()} target="_blank" rel="noopener noreferrer">
                View on map<span className="sr-only"> (opens Google Maps)</span>
              </a>
            </div>
          </div>
        </div>

        <div className={styles.row}>
          <Icon name="phone" />
          <div>
            <H className={styles.h}>Call or message</H>
            <p>
              <a className={styles.phone} href={telLink(phone)}>
                {phone}
              </a>
            </p>
            <div className={styles.buttons}>
              {whatsapp && (
                <a className="btn btn-primary btn-small" href={whatsappLink(whatsapp, "Hi Crazy Bunnies, I'd like to ask about an appointment.")}>
                  <Icon name="whatsapp" size={18} /> WhatsApp
                </a>
              )}
              {instagram && (
                <a className="btn btn-secondary btn-small" href={instagramUrl(instagram)} target="_blank" rel="noopener noreferrer">
                  <Icon name="instagram" size={18} /> Instagram
                </a>
              )}
              {facebook && (
                <a className="btn btn-secondary btn-small" href={facebook} target="_blank" rel="noopener noreferrer">
                  <Icon name="facebook" size={18} /> Facebook
                </a>
              )}
            </div>
          </div>
        </div>

        <div className={styles.row}>
          <Icon name="clock" />
          <div className={styles.hoursWrap}>
            <H className={styles.h}>Opening hours</H>
            {business.isSample && <p className={styles.note}>Hours still to be confirmed by the salon.</p>}
            <table className={styles.hours}>
              <caption className="sr-only">Opening hours</caption>
              <tbody>
                {WEEK_ORDER.map((d) => {
                  const w = business.hours[d];
                  const today = d === todayKey;
                  return (
                    <tr key={d} className={today ? styles.today : undefined} aria-current={today ? "date" : undefined}>
                      <th scope="row">
                        {DAY_NAMES[d]}
                        {today && <span className={styles.todayTag}>Today</span>}
                      </th>
                      <td>{w.length ? w.map(([o, c]) => `${o} to ${c}`).join(", ") : <span className={styles.closedText}>Closed</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className={styles.map}>
        <iframe
          title={`Map showing ${business.address.lines[0]}`}
          src={mapEmbedUrl()}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
    </div>
  );
}
