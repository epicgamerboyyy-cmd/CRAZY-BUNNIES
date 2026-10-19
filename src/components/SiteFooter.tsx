import Link from "next/link";
import { business } from "@/config/business";
import { whatsappLink } from "@/lib/contact";
import styles from "./chrome.module.css";

export function SiteFooter() {
  const { phone, email, whatsapp } = business.contact;
  return (
    <footer className={`${styles.footer} site-footer`}>
      <div className={`wrap ${styles.footerInner}`}>
        <div>
          <p className={styles.footerName}>{business.name}</p>
          {business.address && <p className="muted">{business.address.lines.join(", ")}</p>}
        </div>
        <nav aria-label="Footer">
          <ul className={styles.footerLinks}>
            <li>
              <Link href="/book">Book an appointment</Link>
            </li>
            <li>
              <Link href="/#hours">Opening hours</Link>
            </li>
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
            <li>
              <Link href="/privacy">Privacy notice</Link>
            </li>
          </ul>
        </nav>
        <p className={`muted ${styles.copy}`}>
          © {new Date().getFullYear()} {business.name}
        </p>
      </div>
    </footer>
  );
}
