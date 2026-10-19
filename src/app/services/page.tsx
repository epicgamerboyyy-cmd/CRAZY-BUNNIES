import type { Metadata } from "next";
import Link from "next/link";
import { business, servicesIn, staffDoesService } from "@/config/business";
import { telLink } from "@/lib/contact";
import { formatZar } from "@/lib/money";
import { formatDuration } from "@/lib/time";
import { Icon } from "@/components/Icon";
import { Portrait } from "@/components/Portrait";
import styles from "./services.module.css";

export const metadata: Metadata = {
  title: "Services & pricing",
  description:
    "Braids, haircuts, kiddies styles, nails, makeup, lashes, installs and organic treatments at Crazy Bunnies Family Salon, Centurion. Starting prices and online booking.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <>
      <section className={styles.head} aria-labelledby="page-title">
        <div className="wrap">
          <p className="kicker">Our menu</p>
          <h1 id="page-title">Services &amp; pricing</h1>
          <p className={styles.lede}>
            Prices are starting prices. The final price depends on hair length and style. Not sure what you need?{" "}
            <a href={telLink(business.contact.phone)}>Call us on {business.contact.phone}</a> and we&apos;ll recommend the right
            service for you or your child.
          </p>
          <nav aria-label="Service categories" className={styles.jump}>
            {business.categories.map((c) => (
              <a key={c.id} href={`#${c.id}`}>
                <Icon name={c.icon} size={18} />
                {c.name}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <div className={`wrap ${styles.list}`}>
        {business.categories.map((c) => {
          const items = servicesIn(c.id);
          const team = business.staff.filter((s) => items.some((i) => staffDoesService(s, i)));
          return (
            <section key={c.id} id={c.id} className={`card ${styles.category}`} aria-labelledby={`${c.id}-title`}>
              <header className={styles.catHead}>
                <span className={styles.catIcon}>
                  <Icon name={c.icon} size={30} />
                </span>
                <div className={styles.catText}>
                  <h2 id={`${c.id}-title`}>{c.name}</h2>
                  <p className="muted">{c.blurb}</p>
                </div>
                {c.fromZar !== null && <span className="price-tag">From {formatZar(c.fromZar)}</span>}
              </header>

              <ul className={styles.items}>
                {items.map((s) => (
                  <li key={s.id} className={styles.item}>
                    <div>
                      <h3 className={styles.itemName}>{s.name}</h3>
                      <p className={styles.itemMeta}>
                        <Icon name="clock" size={16} /> About {formatDuration(s.durationMinutes)}
                        {s.priceZar !== null && <>, {formatZar(s.priceZar)}</>}
                      </p>
                    </div>
                    <Link href={`/book?service=${s.id}`} className="btn btn-mint btn-small">
                      Book<span className="sr-only"> {s.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>

              {team.length > 0 && (
                <div className={styles.who}>
                  <span className={styles.faces} aria-hidden="true">
                    {team.slice(0, 5).map((s) => (
                      <Portrait key={s.id} staff={s} sizes="2.5rem" className={styles.face} />
                    ))}
                  </span>
                  <p className="muted">
                    Done by{" "}
                    {team.map((s, i) => (
                      <span key={s.id}>
                        <Link href={`/team/${s.id}`}>{s.name}</Link>
                        {i < team.length - 2 ? ", " : i === team.length - 2 ? " and " : ""}
                      </span>
                    ))}
                  </p>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
