import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { business, fullName } from "@/config/business";
import { Icon } from "@/components/Icon";
import { VisitBlock } from "@/components/VisitBlock";
import { nowMs } from "@/lib/time";
import styles from "../team/team.module.css";

export const metadata: Metadata = {
  title: "Visit us",
  description: `${fullName}: ${business.address.lines.join(", ")}. Opening hours, directions and contact details.`,
  alternates: { canonical: "/visit" },
};

export default async function VisitPage() {
  await connection();
  return (
    <>
      <section className={styles.head} aria-labelledby="page-title">
        <div className="wrap">
          <p className="kicker">Say hello</p>
          <h1 id="page-title">Visit &amp; contact</h1>
          <p className={styles.lede}>
            We&apos;d love to welcome you and your family. Call, pop in, or{" "}
            <Link href="/book">book online</Link> in about a minute.
          </p>
        </div>
      </section>
      <div className="wrap">
        <VisitBlock now={nowMs()} />
        <p style={{ marginTop: "var(--s6)" }}>
          <Link href="/book" className="btn btn-primary">
            Book an appointment <Icon name="arrow" size={18} />
          </Link>
        </p>
      </div>
    </>
  );
}
