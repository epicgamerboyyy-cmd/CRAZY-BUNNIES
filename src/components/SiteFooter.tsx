import Link from "next/link";
import { business, fullName } from "@/config/business";
import { directionsUrl, instagramUrl, telLink, whatsappLink } from "@/lib/contact";
import { BunnyMark, Icon } from "./Icon";
import { NAV_LINKS } from "./SiteHeader";
import styles from "./chrome.module.css";

export function SiteFooter() {
  const { phone, whatsapp, email, instagram, facebook } = business.contact;
  return (
    <footer className={`${styles.footer} site-footer`}>
      <div className={`wrap ${styles.footerInner}`}>
        <div className={styles.footerBrand}>
          <p className={styles.footerBrandRow}>
            <BunnyMark size={36} />
            {fullName}
          </p>
          <p className={styles.footerMuted}>Modern hair and beauty for children and adults in Centurion, with thoughtful service and gentle organic products.</p>
          {(instagram || facebook) && (
            <div className={styles.social}>
              {instagram && (
                <a href={instagramUrl(instagram)} target="_blank" rel="noopener noreferrer">
                  <Icon name="instagram" label={`Instagram @${instagram}`} />
                </a>
              )}
              {facebook && (
                <a href={facebook} target="_blank" rel="noopener noreferrer">
                  <Icon name="facebook" label="Facebook" />
                </a>
              )}
            </div>
          )}
        </div>

        <div>
          <h2 className={styles.footerHeading}>Visit us</h2>
          <address style={{ fontStyle: "normal" }} className={styles.footerMuted}>
            {business.address.lines.map((l) => (
              <span key={l} style={{ display: "block" }}>
                {l}
              </span>
            ))}
          </address>
          <ul className={styles.footerList}>
            <li>
              <a href={directionsUrl()} target="_blank" rel="noopener noreferrer">
                <Icon name="pin" size={18} /> Get directions
              </a>
            </li>
            <li>
              <a href={telLink(phone)}>
                <Icon name="phone" size={18} /> {phone}
              </a>
            </li>
            {whatsapp && (
              <li>
                <a href={whatsappLink(whatsapp)}>
                  <Icon name="whatsapp" size={18} /> WhatsApp us
                </a>
              </li>
            )}
            {email && (
              <li>
                <a href={`mailto:${email}`}>{email}</a>
              </li>
            )}
          </ul>
        </div>

        <nav aria-label="Footer">
          <h2 className={styles.footerHeading}>Explore</h2>
          <ul className={styles.footerList}>
            <li>
              <Link href="/book">Book an appointment</Link>
            </li>
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href}>{l.label}</Link>
              </li>
            ))}
            <li>
              <Link href="/feedback">Feedback &amp; complaints</Link>
            </li>
            <li>
              <Link href="/privacy">Privacy notice</Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="wrap">
        <p className={styles.copy}>
          © {new Date().getFullYear()} {fullName}, Centurion
        </p>
      </div>
    </footer>
  );
}
