import Link from "next/link";
import { business } from "@/config/business";
import { directionsUrl, telLink } from "@/lib/contact";
import { Icon } from "./Icon";
import styles from "./chrome.module.css";

/** Always-visible Book / Call / Directions on phones, like the salon's old site. */
export function ActionBar() {
  return (
    <nav aria-label="Quick actions" className={`${styles.actionBar} action-bar`}>
      <Link href="/book" className="btn btn-mint">
        <Icon name="calendar" size={18} />
        Book
      </Link>
      <a href={telLink(business.contact.phone)} className="btn btn-primary">
        <Icon name="phone" size={18} />
        Call
      </a>
      <a href={directionsUrl()} className="btn btn-secondary" target="_blank" rel="noopener noreferrer">
        <Icon name="pin" size={18} />
        Directions<span className="sr-only"> (opens Google Maps)</span>
      </a>
    </nav>
  );
}
