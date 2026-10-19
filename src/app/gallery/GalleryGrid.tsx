"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Category, GalleryItem, IconName } from "@/config/business";
import { Icon } from "@/components/Icon";
import styles from "./gallery.module.css";

interface Props {
  items: GalleryItem[];
  categories: Category[];
  staffNames: Record<string, string>;
}

export function GalleryGrid({ items, categories, staffNames }: Props) {
  const [filter, setFilter] = useState<string>("all");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  const placeholders = items.length === 0;
  const shown = filter === "all" ? items : items.filter((g) => g.categoryId === filter);
  const usedCategories = placeholders ? categories : categories.filter((c) => items.some((g) => g.categoryId === c.id));
  const current = openIndex !== null ? shown[openIndex] : undefined;

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (current && !d.open) d.showModal();
    if (!current && d.open) d.close();
  }, [current]);

  function open(i: number, el: HTMLElement) {
    returnFocus.current = el;
    setOpenIndex(i);
  }

  function close() {
    setOpenIndex(null);
    returnFocus.current?.focus();
  }

  const step = (dir: 1 | -1) => setOpenIndex((i) => (i === null ? i : (i + dir + shown.length) % shown.length));

  return (
    <>
      <div className={styles.filters} role="group" aria-label="Filter photos">
        {[{ id: "all", name: "All" }, ...usedCategories].map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={filter === c.id}
            className={styles.filter}
            onClick={() => setFilter(c.id)}
          >
            {c.name}
          </button>
        ))}
      </div>

      {placeholders ? (
        <ul className={styles.grid}>
          {(filter === "all" ? categories : categories.filter((c) => c.id === filter))
            .flatMap((c) => [c, c])
            .map((c, i) => (
              <li key={`${c.id}-${i}`} className={styles.tile}>
                <span className={styles.empty} style={{ background: `var(--tint-${(i % 4) + 1})`, aspectRatio: i % 3 === 0 ? "4 / 5" : "1 / 1" }}>
                  <Icon name={c.icon as IconName} size={34} />
                  <span>{c.name} photo coming soon</span>
                </span>
              </li>
            ))}
        </ul>
      ) : (
        <ul className={styles.grid}>
          {shown.map((g, i) => (
            <li key={g.src} className={styles.tile}>
              <button
                type="button"
                className={styles.thumb}
                onClick={(e) => open(i, e.currentTarget)}
                aria-label={`Open photo: ${g.alt}`}
                style={{ aspectRatio: `${g.width} / ${g.height}` }}
              >
                <Image src={g.src} alt="" fill sizes="(min-width: 60rem) 24rem, 50vw" className={styles.cover} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <dialog
        ref={dialogRef}
        className={styles.viewer}
        aria-label="Photo viewer"
        onClose={() => openIndex !== null && close()}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        {current && (
          <figure className={styles.figure}>
            <div className={styles.viewerImg} style={{ aspectRatio: `${current.width} / ${current.height}` }}>
              <Image src={current.src} alt={current.alt} fill sizes="90vw" className={styles.contain} />
            </div>
            <figcaption>
              {current.alt}
              {current.staffId && staffNames[current.staffId] && <span className={styles.by}> By {staffNames[current.staffId]}</span>}
              <span className={styles.count}>
                {openIndex! + 1} of {shown.length}
              </span>
            </figcaption>
          </figure>
        )}
        <div className={styles.viewerControls}>
          <button type="button" className="btn btn-light btn-small" onClick={() => step(-1)} disabled={shown.length < 2}>
            Previous
          </button>
          <button type="button" className="btn btn-light btn-small" onClick={() => step(1)} disabled={shown.length < 2}>
            Next
          </button>
          <button type="button" className="btn btn-mint btn-small" onClick={close} autoFocus>
            <Icon name="close" size={18} /> Close
          </button>
        </div>
      </dialog>
    </>
  );
}
