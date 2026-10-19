import Link from "next/link";
import { business } from "@/config/business";
import styles from "./chrome.module.css";

export function SiteHeader() {
  return (
    <header className={`${styles.header} site-header`}>
      <div className={`wrap ${styles.headerInner}`}>
        <Link href="/" className={styles.brand}>
          {business.name}
        </Link>
        <nav aria-label="Main" className={styles.nav}>
          <Link href="/#services" className={styles.navLink}>
            Services
          </Link>
          <Link href="/#hours" className={styles.navLink}>
            Hours
          </Link>
          <Link href="/book" className="btn btn-primary btn-small">
            Book
          </Link>
        </nav>
      </div>
    </header>
  );
}
