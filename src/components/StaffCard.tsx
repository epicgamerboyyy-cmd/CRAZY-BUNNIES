import Link from "next/link";
import type { StaffMember } from "@/config/business";
import { Portrait } from "./Portrait";
import styles from "./media.module.css";

export function StaffCard({ staff, priority }: { staff: StaffMember; priority?: boolean }) {
  return (
    <Link href={`/team/${staff.id}`} className={styles.staffCard}>
      <Portrait staff={staff} sizes="(min-width: 64rem) 14rem, (min-width: 40rem) 30vw, 45vw" priority={priority} />
      <span className={styles.staffName}>{staff.name}</span>
      <span className={styles.staffRole}>{staff.role}</span>
    </Link>
  );
}
