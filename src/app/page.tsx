import Link from "next/link";
import { connection } from "next/server";
import { business, servicesIn } from "@/config/business";
import { instagramUrl, telLink } from "@/lib/contact";
import { formatZar } from "@/lib/money";
import { openStatus } from "@/lib/hours";
import { nowMs } from "@/lib/time";
import { Icon } from "@/components/Icon";
import { PhotoFrame } from "@/components/PhotoFrame";
import { Portrait } from "@/components/Portrait";
import { StaffCard } from "@/components/StaffCard";
import { VisitBlock } from "@/components/VisitBlock";
import styles from "./home.module.css";

export default async function HomePage() {
  // "Open now" depends on the current time, so render per request.
  await connection();
  const now = nowMs();
  const status = openStatus(business.hours, business.closedDates, now, business.timezone);
  const faces = business.staff.slice(0, 4);
  const galleryPreview = business.gallery.slice(0, 6);

  return (
    <>
      {/* Hero */}
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={`wrap ${styles.heroGrid}`}>
          <div className={styles.heroText}>
            <p className={styles.heroKicker}>
              <Icon name="sparkle" size={20} /> Hair &amp; beauty in Centurion
            </p>
            <h1 id="hero-title" className={styles.heroTitle}>
              {business.headline.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </h1>
            <p className={styles.lede}>{business.intro}</p>
            <div className={styles.heroActions}>
              <Link href="/book" className="btn btn-primary">
                Book an appointment <Icon name="arrow" size={18} />
              </Link>
              <a href={telLink(business.contact.phone)} className="btn btn-sun">
                <Icon name="phone" size={18} /> Call {business.contact.phone}
              </a>
            </div>
            <p className={`${styles.statusLine} ${status.open ? styles.isOpen : ""}`}>
              <span className={styles.dot} aria-hidden="true" />
              {status.text}
              <span className={styles.sep} aria-hidden="true" />
              <Link href="/visit">{business.address.lines[0]}</Link>
            </p>
          </div>

          <div className={styles.heroArt}>
            <PhotoFrame
              photo={business.heroPhoto}
              shape="arch"
              ratio="4 / 5"
              tint={1}
              priority
              sizes="(min-width: 60rem) 30rem, 90vw"
              placeholderLabel="Salon photo coming soon"
            />
            <Link href="/team" className={styles.pickCard}>
              <span className={styles.faces} aria-hidden="true">
                {faces.map((s) => (
                  <Portrait key={s.id} staff={s} sizes="3rem" className={styles.face} />
                ))}
              </span>
              <span>
                <strong>Choose your stylist</strong>
                <span className={styles.pickSub}>{business.staff.length} people ready to help</span>
              </span>
              <Icon name="arrow" />
            </Link>
          </div>
        </div>
      </section>

      {/* What we do, at a glance */}
      <section className={styles.strip} aria-label="What we do">
        <ul className={`wrap ${styles.stripList}`}>
          {business.categories.map((c) => (
            <li key={c.id}>
              <Link href={`/services#${c.id}`}>
                <Icon name={c.icon} size={20} />
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Services */}
      <section className="section" aria-labelledby="services-title">
        <div className="wrap">
          <div className={`section-head ${styles.headRow}`}>
            <div>
              <h2 id="services-title">One salon. Every kind of style.</h2>
              <p>Prices are starting prices. The final price depends on hair length and style, so ask us for a quick quote.</p>
            </div>
            <Link href="/services" className="btn btn-secondary btn-small">
              Full menu
            </Link>
          </div>
          <ul className={styles.services}>
            {business.categories.map((c) => (
              <li key={c.id} className={`card ${styles.service}`}>
                <div className={styles.serviceTop}>
                  <span className={styles.serviceIcon}>
                    <Icon name={c.icon} size={26} />
                  </span>
                  {c.fromZar !== null && <span className="price-tag">From {formatZar(c.fromZar)}</span>}
                </div>
                <h3>{c.name}</h3>
                <p className="muted">{c.blurb}</p>
                <ul className="chips" aria-label={`${c.name} includes`}>
                  {servicesIn(c.id).map((s) => (
                    <li key={s.id} className="chip">
                      {s.name}
                    </li>
                  ))}
                </ul>
                <Link href={`/book?category=${c.id}`} className={styles.serviceLink}>
                  Book {c.name.toLowerCase()} <Icon name="arrow" size={18} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Team */}
      <section className={`section ${styles.teamSection}`} aria-labelledby="team-title">
        <div className="wrap">
          <div className={`section-head ${styles.headRow}`}>
            <div>
              <h2 id="team-title">Book the stylist you love</h2>
              <p>Tap a face to see what they do best and book them directly. No preference? Book with whoever&apos;s free.</p>
            </div>
            <Link href="/book" className="btn btn-primary btn-small">
              Anyone available
            </Link>
          </div>
          <ul className={styles.team}>
            {business.staff.map((s) => (
              <li key={s.id}>
                <StaffCard staff={s} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* About */}
      <section className="section" aria-labelledby="about-title">
        <div className={`wrap ${styles.about}`}>
          <div className={styles.aboutText}>
            <p className="kicker">Professional care. Playful spirit.</p>
            <h2 id="about-title">A salon made for families</h2>
            {business.about.map((p) => (
              <p key={p.slice(0, 20)}>{p}</p>
            ))}
          </div>
          <ul className={styles.highlights}>
            {business.highlights.map((h) => (
              <li key={h.title}>
                <span className={styles.hlIcon}>
                  <Icon name={h.icon} size={26} />
                </span>
                <div>
                  <h3>{h.title}</h3>
                  <p className="muted">{h.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Gallery preview */}
      <section className={`section ${styles.gallerySection}`} aria-labelledby="gallery-title">
        <div className="wrap">
          <div className={`section-head ${styles.headRow}`}>
            <div>
              <h2 id="gallery-title">Happy hair days</h2>
              <p>
                A peek at the work that comes out of our chairs.
                {business.contact.instagram && <> Tag @{business.contact.instagram} to be featured.</>}
              </p>
            </div>
            <Link href="/gallery" className="btn btn-secondary btn-small">
              See the gallery
            </Link>
          </div>
          <ul className={styles.galleryGrid}>
            {(galleryPreview.length ? galleryPreview : Array.from({ length: 6 }, () => null)).map((g, i) => (
              <li key={g?.src ?? i}>
                <PhotoFrame
                  photo={g}
                  ratio={i % 3 === 1 ? "4 / 5" : "1 / 1"}
                  tint={((i % 4) + 1) as 1 | 2 | 3 | 4}
                  sizes="(min-width: 60rem) 22rem, 45vw"
                  placeholderIcon={business.categories[i % business.categories.length]!.icon}
                />
              </li>
            ))}
          </ul>
          {business.contact.instagram && (
            <p className={styles.insta}>
              <a href={instagramUrl(business.contact.instagram)} className="btn btn-primary" target="_blank" rel="noopener noreferrer">
                <Icon name="instagram" size={18} /> Follow @{business.contact.instagram}
              </a>
            </p>
          )}
        </div>
      </section>

      {/* Visit */}
      <section className="section" aria-labelledby="visit-title">
        <div className="wrap">
          <div className="section-head">
            <h2 id="visit-title">Come and visit</h2>
            <p>You&apos;ll find us at Shop 20B in Celtis Ridge Shopping Centre, Centurion.</p>
          </div>
          <VisitBlock now={now} headingLevel={3} />
        </div>
      </section>

      {/* Closing call to action */}
      <section className={styles.cta} aria-labelledby="cta-title">
        <div className={`wrap ${styles.ctaInner}`}>
          <h2 id="cta-title">Ready for a fresh salon day?</h2>
          <p>Pick a time that suits you and the person you want. It takes about a minute.</p>
          <div className={styles.heroActions}>
            <Link href="/book" className="btn btn-mint">
              Book an appointment <Icon name="arrow" size={18} />
            </Link>
            <a href={telLink(business.contact.phone)} className="btn btn-light">
              <Icon name="phone" size={18} /> {business.contact.phone}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
