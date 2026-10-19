import type { Metadata } from "next";
import { business } from "@/config/business";
import styles from "./privacy.module.css";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: `What ${business.name} does with the details you give when booking or sending feedback.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  const { email, phone } = business.contact;
  const contact = email ?? phone;
  return (
    <article className={`wrap ${styles.page}`}>
      <h1>Privacy notice</h1>
      <p className="muted">How {business.name} handles the details you give us when you book or send feedback.</p>

      {business.isSample && (
        <div className="notice notice-warn" role="note">
          <strong>Draft.</strong> The business owner still needs to review this notice and add their contact details. It
          describes how this booking site works, not legal advice.
        </div>
      )}

      <h2>What we collect</h2>
      <p>
        When you book, we ask for your name and phone number, and optionally your email address and a note. We also store the
        service, date and time you chose, who the appointment is with, whether it&apos;s for a child or an adult, and a
        reference for the booking.
      </p>
      <p>
        When you send feedback or a complaint, we store your message and anything optional you add: a visit date, stylist,
        service, your name, and a phone number or email if you ask for a reply. You can send feedback anonymously. To stop
        spam we keep a scrambled code derived from your internet address, never the address itself.
      </p>

      <h2>Why</h2>
      <p>
        Booking details are used only to manage your appointment: to know who&apos;s coming, to contact you if something
        changes, and to keep a record of appointments. Feedback is used to deal with your concern, reply if you asked us to,
        and improve the salon. We don&apos;t use your details for marketing and we don&apos;t sell them.
      </p>

      <h2>Who can see it</h2>
      <p>
        The business owner, through a password-protected dashboard. Feedback is not shown to the stylist it mentions unless
        the owner chooses to share it. Appointments may also be copied into the owner&apos;s
        calendar. The site is hosted on Vercel and the booking data is stored in a Neon database, both acting as service
        providers.
      </p>

      <h2>How long we keep it</h2>
      <p>For as long as it&apos;s needed to run the business and keep reasonable records, after which it&apos;s deleted.</p>

      <h2>Your rights</h2>
      <p>
        Under South Africa&apos;s Protection of Personal Information Act (POPIA) you can ask to see the details we hold about you,
        ask us to correct or delete them, and object to how they&apos;re used.{" "}
        {contact ? <>Contact us at {contact} to do this.</> : "Contact the business directly to do this."} You can also complain
        to the Information Regulator of South Africa.
      </p>

      <h2>Cookies</h2>
      <p>
        Booking doesn&apos;t use tracking or advertising cookies. The owner&apos;s dashboard uses one cookie to keep the owner
        signed in.
      </p>
    </article>
  );
}
