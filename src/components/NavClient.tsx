"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "./Icon";
import styles from "./chrome.module.css";

type NavLink = { href: string; label: string };

const isCurrent = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

export function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  return (
    <ul className={styles.navList}>
      {links.map((l) => (
        <li key={l.href}>
          <Link href={l.href} className={styles.navLink} aria-current={isCurrent(pathname, l.href) ? "page" : undefined}>
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function MobileMenu({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState<string | null>(null);
  const pathname = usePathname();
  const id = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on navigation (state adjusted during render rather than in an effect).
  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className={styles.menu}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.menuButton}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
        <span>Menu</span>
      </button>
      <div id={id} className={styles.menuPanel} hidden={!open}>
        <ul>
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} aria-current={isCurrent(pathname, l.href) ? "page" : undefined} onClick={() => setOpen(false)}>
                {l.label}
                <Icon name="arrow" size={22} />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
