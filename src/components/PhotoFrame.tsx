import Image from "next/image";
import type { IconName, Photo } from "@/config/business";
import { Icon } from "./Icon";
import styles from "./media.module.css";

interface Props {
  photo: Photo | null;
  sizes: string;
  priority?: boolean;
  /** Shown in the empty frame until a real photo is added. */
  placeholderIcon?: IconName;
  placeholderLabel?: string;
  shape?: "arch" | "rounded";
  ratio?: string;
  tint?: 1 | 2 | 3 | 4;
  className?: string;
}

export function PhotoFrame({
  photo,
  sizes,
  priority,
  placeholderIcon = "bunny",
  placeholderLabel = "Photo coming soon",
  shape = "rounded",
  ratio = "4 / 5",
  tint = 1,
  className,
}: Props) {
  return (
    <span
      className={`${styles.frame} ${shape === "arch" ? styles.arch : ""} ${className ?? ""}`}
      style={{ aspectRatio: ratio, background: `var(--tint-${tint})` }}
    >
      {photo ? (
        <Image src={photo.src} alt={photo.alt} fill sizes={sizes} priority={priority} className={styles.cover} />
      ) : (
        <span className={styles.empty}>
          <Icon name={placeholderIcon} size={36} />
          <span>{placeholderLabel}</span>
        </span>
      )}
    </span>
  );
}
