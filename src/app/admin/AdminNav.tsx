import Link from "next/link";
import { logout } from "./actions";
import styles from "./admin.module.css";

export function AdminNav({ current, newFeedback }: { current: "bookings" | "feedback"; newFeedback: number }) {
  return (
    <div className={styles.top}>
      <nav aria-label="Dashboard" className={styles.tabs}>
        <Link href="/admin" aria-current={current === "bookings" ? "page" : undefined}>
          Bookings
        </Link>
        <Link href="/admin/feedback" aria-current={current === "feedback" ? "page" : undefined}>
          Feedback
          {newFeedback > 0 && (
            <span className={styles.badge}>
              {newFeedback}
              <span className="sr-only"> new</span>
            </span>
          )}
        </Link>
      </nav>
      <form action={logout}>
        <button type="submit" className="btn btn-secondary btn-small">
          Sign out
        </button>
      </form>
    </div>
  );
}
