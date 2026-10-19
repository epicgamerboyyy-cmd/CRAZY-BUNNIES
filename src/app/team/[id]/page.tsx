import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { business, fullName, getStaff, hoursFor, servicesForStaff } from "@/config/business";
import { DAY_NAMES, WEEK_ORDER } from "@/lib/hours";
import { formatDuration } from "@/lib/time";
import { Icon } from "@/components/Icon";
import { PhotoFrame } from "@/components/PhotoFrame";
import { Portrait } from "@/components/Portrait";
import styles from "../team.module.css";

export function generateStaticParams() {
  return business.staff.map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const staff = getStaff((await params).id);
  if (!staff) return {};
  return {
    title: `${staff.name}, ${staff.role}`,
    description: `Book ${staff.name} (${staff.role}) at ${fullName}, Centurion.`,
    alternates: { canonical: `/team/${staff.id}` },
  };
}

export default async function StaffPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = getStaff((await params).id);
  if (!staff) notFound();

  const services = servicesForStaff(staff.id);
  const hours = hoursFor(staff);
  const work = business.gallery.filter((g) => g.staffId === staff.id);
  const categories = business.categories.filter((c) => services.some((s) => s.categoryId === c.id));

  return (
    <div className={`wrap ${styles.profile}`}>
      <Link href="/team" className={styles.back}>
        <Icon name="back" size={18} /> All stylists
      </Link>

      <div className={styles.profileGrid}>
        <div className={styles.photoCol}>
          <Portrait staff={staff} sizes="(min-width: 52rem) 22rem, 90vw" priority />
        </div>

        <div className={styles.info}>
          <p className={styles.role}>{staff.role}</p>
          <h1>{staff.name}</h1>
          <p>{staff.bio}</p>

          <div>
            <h2 className="sr-only">Days at the salon</h2>
            <ul className={styles.days} aria-label="Days at the salon">
              {WEEK_ORDER.map((d) => {
                const on = hours[d].length > 0;
                return (
                  <li key={d} data-off={on ? undefined : ""}>
                    <span aria-hidden="true">{DAY_NAMES[d].slice(0, 3)}</span>
                    <span className="sr-only">
                      {DAY_NAMES[d]}: {on ? "working" : "not working"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <Link href={`/book?staff=${staff.id}`} className="btn btn-primary">
              Book with {staff.name} <Icon name="arrow" size={18} />
            </Link>
          </div>

          <div className={styles.offerings}>
            <h2 className={styles.groupTitle} style={{ marginBottom: 0 }}>
              What {staff.name} does
            </h2>
            {categories.map((c) => (
              <div key={c.id} className={styles.offerGroup}>
                <h3>
                  <Icon name={c.icon} size={22} /> {c.name}
                </h3>
                <ul className={styles.offerList}>
                  {services
                    .filter((s) => s.categoryId === c.id)
                    .map((s) => (
                      <li key={s.id}>
                        <Link href={`/book?staff=${staff.id}&service=${s.id}`}>
                          <span>
                            {s.name}
                            <small>About {formatDuration(s.durationMinutes)}</small>
                          </span>
                          <Icon name="arrow" size={20} />
                          
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className={styles.work} aria-labelledby="work-title">
        <h2 id="work-title" className={styles.groupTitle}>
          {staff.name}&apos;s work
        </h2>
        {work.length ? (
          <ul className={styles.workGrid}>
            {work.map((g) => (
              <li key={g.src}>
                <PhotoFrame photo={g} ratio="1 / 1" sizes="(min-width: 60rem) 16rem, 45vw" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">
            Photos of {staff.name}&apos;s work are coming soon. In the meantime, see the <Link href="/gallery">salon gallery</Link>.
          </p>
        )}
      </section>
    </div>
  );
}
