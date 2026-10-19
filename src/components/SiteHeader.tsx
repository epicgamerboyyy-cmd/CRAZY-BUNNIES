import Link from "next/link";
import { business } from "@/config/business";
import { BunnyMark } from "./Icon";
import { NavLinks, MobileMenu } from "./NavClient";
import styles from "./chrome.module.css";

export const NAV_LINKS = [
  { href: "/services", label: "Services" },
  { href: "/team", label: "Our team" },
  { href: "/gallery", label: "Gallery" },
  { href: "/visit", label: "Visit us" },
];

export function SiteHeader() {
  return (
    <header className={`${styles.header} site-header`}>
      <div className={`wrap ${styles.headerInner}`}>
        <Link href="/" className={styles.brand} aria-label={`${business.name} ${business.descriptor}, home`}>
          <BunnyMark size={40} />
          <span className={styles.brandText} aria-hidden="true">
            <span className={styles.brandName}>{business.name}</span>
            <span className={styles.brandSub}>{business.descriptor}</span>
          </span>
        </Link>
        <nav aria-label="Main" className={styles.nav}>
          <NavLinks links={NAV_LINKS} />
          <Link href="/book" className={`btn btn-primary btn-small ${styles.bookBtn}`}>
            Book now
          </Link>
          <MobileMenu links={[...NAV_LINKS, { href: "/book", label: "Book an appointment" }]} />
        </nav>
      </div>
    </header>
  );
}
