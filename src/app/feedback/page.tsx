import type { Metadata } from "next";
import { connection } from "next/server";
import { business } from "@/config/business";
import { telLink, whatsappLink } from "@/lib/contact";
import { localDate, nowMs } from "@/lib/time";
import { Icon } from "@/components/Icon";
import { FeedbackForm } from "./FeedbackForm";
import styles from "./feedback.module.css";

export const metadata: Metadata = {
  title: "Feedback & complaints",
  description: "Tell Crazy Bunnies Family Salon what went wrong, what we could improve, or what you loved. Anonymous messages welcome.",
  alternates: { canonical: "/feedback" },
};

export default async function FeedbackPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  await connection();
  const { type } = await searchParams;
  const initialKind = type === "complaint" || type === "improvement" || type === "compliment" ? type : null;
  const { phone, whatsapp } = business.contact;

  return (
    <div className={`wrap ${styles.page}`}>
      <header className={styles.head}>
        <p className="kicker">We&apos;re listening</p>
        <h1>Feedback &amp; complaints</h1>
        <p className={styles.lede}>
          Something not right, an idea to make visits better, or a stylist you want to thank? Tell us here. You can stay
          anonymous, and every message is read by the salon owner.
        </p>
      </header>

      <div className={styles.layout}>
        <FeedbackForm
          staff={business.staff.map((s) => ({ id: s.id, name: s.name }))}
          services={business.services.map((s) => ({ id: s.id, name: s.name }))}
          today={localDate(nowMs(), business.timezone)}
          initialKind={initialKind}
        />

        <aside className={styles.aside} aria-label="Other ways to reach us">
          <div className={`glass ${styles.asideCard}`}>
            <h2>Need it sorted today?</h2>
            <p className="muted">For anything about an upcoming appointment, it&apos;s quickest to talk to us directly.</p>
            <div className={styles.asideBtns}>
              <a href={telLink(phone)} className="btn btn-secondary btn-small">
                <Icon name="phone" size={18} /> Call {phone}
              </a>
              {whatsapp && (
                <a href={whatsappLink(whatsapp)} className="btn btn-secondary btn-small">
                  <Icon name="whatsapp" size={18} /> WhatsApp
                </a>
              )}
            </div>
          </div>
          <div className={`glass ${styles.asideCard}`}>
            <h2>What happens next</h2>
            <ol className={styles.steps}>
              <li>Your message goes privately to the salon owner.</li>
              <li>If you asked for a reply, we contact you using the details you gave.</li>
              <li>Ideas and complaints are used to improve how the salon runs.</li>
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}
