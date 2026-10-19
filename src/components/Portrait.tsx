import Image from "next/image";
import { business, initials, type StaffMember } from "@/config/business";
import styles from "./media.module.css";

interface Props {
  staff: StaffMember;
  /** Passed to next/image so the right size is downloaded. */
  sizes: string;
  priority?: boolean;
  className?: string;
}

/**
 * A staff photo in the arch frame. Until a real photo is added it shows their
 * initials on a soft tint, so the layout looks finished and never shifts later.
 */
export function Portrait({ staff, sizes, priority, className }: Props) {
  const index = business.staff.findIndex((s) => s.id === staff.id);
  const tint = `var(--tint-${(Math.max(index, 0) % 4) + 1})`;
  return (
    <span className={`${styles.portrait} ${className ?? ""}`} style={{ background: tint }}>
      {staff.photo ? (
        <Image src={staff.photo} alt="" fill sizes={sizes} priority={priority} className={styles.cover} />
      ) : (
        <span className={styles.initials} aria-hidden="true">
          {initials(staff.name)}
        </span>
      )}
    </span>
  );
}
