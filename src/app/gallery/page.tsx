import type { Metadata } from "next";
import Link from "next/link";
import { business, SALON_CATEGORY } from "@/config/business";
import { instagramUrl } from "@/lib/contact";
import { Icon } from "@/components/Icon";
import { GalleryGrid } from "./GalleryGrid";
import styles from "./gallery.module.css";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Braids, cuts, kiddies styles, nails and makeup from Crazy Bunnies Family Salon in Centurion.",
  alternates: { canonical: "/gallery" },
};

export default function GalleryPage() {
  const { instagram } = business.contact;
  return (
    <>
      <section className={styles.head} aria-labelledby="page-title">
        <div className="wrap">
          <p className="kicker">Our work</p>
          <h1 id="page-title">Gallery</h1>
          <p className={styles.lede}>
            Inside the salon, and a look at the styles we do.
            {instagram && <> Tag @{instagram} on Instagram to be featured.</>}
          </p>
        </div>
      </section>
      <div className="wrap">
        <GalleryGrid
          items={business.gallery}
          categories={[SALON_CATEGORY, ...business.categories]}
          staffNames={Object.fromEntries(business.staff.map((s) => [s.id, s.name]))}
        />
        <aside className={`card ${styles.follow}`} aria-labelledby="follow-title">
          <h2 id="follow-title">Follow the fun</h2>
          <p className="muted">See daily styles and behind-the-scenes on our socials.</p>
          <div className={styles.followBtns}>
            {instagram && (
              <a href={instagramUrl(instagram)} className="btn btn-primary" target="_blank" rel="noopener noreferrer">
                <Icon name="instagram" size={18} /> @{instagram}
              </a>
            )}
            <Link href="/book" className="btn btn-mint">
              Book your style
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
