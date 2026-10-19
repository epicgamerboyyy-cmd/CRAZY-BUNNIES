import type { Metadata } from "next";
import Link from "next/link";
import { business } from "@/config/business";
import { StaffCard } from "@/components/StaffCard";
import styles from "./team.module.css";

export const metadata: Metadata = {
  title: "Our team",
  description: "Meet the stylists, nail technicians and makeup artists at Crazy Bunnies Family Salon, and book the one you love.",
  alternates: { canonical: "/team" },
};

export default function TeamPage() {
  return (
    <>
      <section className={styles.head} aria-labelledby="page-title">
        <div className="wrap">
          <p className="kicker">The people behind the chairs</p>
          <h1 id="page-title">Meet our team</h1>
          <p className={styles.lede}>
            Everyone has their favourite. Tap a stylist to see what they do and book them directly, or{" "}
            <Link href="/book">book with whoever is free</Link>.
          </p>
        </div>
      </section>
      <div className="wrap">
        {business.categories
          .filter((c) => business.staff.some((s) => s.categoryIds[0] === c.id))
          .map((c) => {
            const people = business.staff.filter((s) => s.categoryIds[0] === c.id);
            return (
              <section key={c.id} className={styles.group} aria-labelledby={`g-${c.id}`}>
                <h2 id={`g-${c.id}`} className={styles.groupTitle}>
                  {c.name}
                </h2>
                <ul className={styles.grid}>
                  {people.map((s, i) => (
                    <li key={s.id}>
                      <StaffCard staff={s} priority={i < 4} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
      </div>
    </>
  );
}
