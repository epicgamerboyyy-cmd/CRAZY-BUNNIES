import type { IconName } from "@/config/business";

/** One line-icon family: 24px grid, 1.75 stroke, round caps. Decorative by default. */
const PATHS: Record<IconName | UiIcon, React.ReactNode> = {
  braids: (
    <>
      <path d="M8 3c0 3 3 3 3 6s-3 3-3 6 3 3 3 6" />
      <path d="M14 3c0 3 3 3 3 6s-3 3-3 6 3 3 3 6" />
      <path d="M8 3h9" />
    </>
  ),
  // Two groups so the blades can close around the pivot (see .snip-card in globals.css)
  scissors: (
    <>
      <g className="blade blade-a">
        <circle cx="6" cy="7" r="2.5" />
        <path d="M8.2 8.2 20 18" />
      </g>
      <g className="blade blade-b">
        <circle cx="6" cy="17" r="2.5" />
        <path d="M8.2 15.8 20 6" />
      </g>
    </>
  ),
  bunny: (
    <>
      <path d="M9 10C7.5 7 7.4 3.5 8.6 3.1 10 2.7 11 6.5 11 9.5" />
      <path d="M15 10c1.5-3 1.6-6.5.4-6.9C14 2.7 13 6.5 13 9.5" />
      <circle cx="12" cy="15" r="5.5" />
      <path d="M10 14.5h.01M14 14.5h.01M11 17.2c.6.5 1.4.5 2 0" />
    </>
  ),
  nails: (
    <>
      <path d="M8 21v-9a4 4 0 0 1 8 0v9" />
      <path d="M10 12V7.5a2 2 0 0 1 4 0V12" />
      <path d="M12 2.5v1.5" />
    </>
  ),
  makeup: (
    <>
      <path d="M9 21h6M10 21v-7h4v7" />
      <path d="M10 14l1-9 3 2-1 7" />
      <path d="M18.5 4.5l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5L16.5 6.5 18 6z" />
    </>
  ),
  lashes: (
    <>
      <path d="M3 12c3.5 4 14.5 4 18 0" />
      <path d="M5.5 14.5 4 17M9 15.8l-.6 2.7M12 16.2V19M15 15.8l.6 2.7M18.5 14.5 20 17" />
      <path d="M3 12c3.5-4 14.5-4 18 0" opacity=".45" />
    </>
  ),
  leaf: (
    <>
      <path d="M5 19c0-8 5-13 15-14-.5 10-6 15-14 15" />
      <path d="M5 19c3-5 6-8 10-10" />
    </>
  ),
  phone: <path d="M6.5 3.5h3l1.5 4-2 1.2a11 11 0 0 0 6.3 6.3l1.2-2 4 1.5v3a2 2 0 0 1-2 2A16.5 16.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2z" />,
  whatsapp: (
    <>
      <path d="M4 20l1.2-4A8.5 8.5 0 1 1 8.4 19z" />
      <path d="M9 8.5c.2 2.8 3.7 6.3 6.5 6.5l1-1.5-2-1-1 .8c-1-.4-2-1.4-2.4-2.4l.8-1-1-2z" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  back: <path d="M19 12H5M11 6l-6 6 6 6" />,
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M17 7h.01" />
    </>
  ),
  facebook: <path d="M14.5 21v-7.5h2.5l.5-3h-3V8.8c0-.9.3-1.6 1.6-1.6h1.5V4.6c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.1H9v3h2.5V21" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  sparkle: <path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6zM18.5 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />,
  user: (
    <>
      <circle cx="12" cy="8.5" r="4" />
      <path d="M4.5 20.5c1-4 4-6 7.5-6s6.5 2 7.5 6" />
    </>
  ),
  child: (
    <>
      <circle cx="12" cy="10" r="3.2" />
      <path d="M7 20c.7-3 2.6-4.6 5-4.6s4.3 1.6 5 4.6" />
      <path d="M9.6 7.5C9 5 10 3.5 12 3.5s3 1.5 2.4 4" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8.5" r="3.5" />
      <path d="M3 20c.8-3.5 3.2-5.5 6-5.5s5.2 2 6 5.5" />
      <path d="M15.5 5.2a3.5 3.5 0 0 1 0 6.6M17.5 14.8c1.8.7 3 2.5 3.5 5.2" />
    </>
  ),
};

export type UiIcon =
  | "phone"
  | "whatsapp"
  | "pin"
  | "clock"
  | "calendar"
  | "arrow"
  | "back"
  | "instagram"
  | "facebook"
  | "check"
  | "close"
  | "sparkle"
  | "user"
  | "child"
  | "people";

export function Icon({
  name,
  size = 22,
  label,
  className,
}: {
  name: IconName | UiIcon;
  size?: number;
  /** Give a label only when the icon stands alone and carries meaning. */
  label?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      data-icon={name}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}

/** Stand-in brand mark until the salon's own logo file is added. */
export function BunnyMark({ size = 40 }: { size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true" focusable="false">
      <rect width="40" height="40" rx="11" fill="var(--mint)" />
      <g fill="none" stroke="var(--berry-deep)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15.5 17c-2.3-4.5-2.4-9.5-.7-10.1 2-.6 3.5 4.8 3.5 9" />
        <path d="M24.5 17c2.3-4.5 2.4-9.5.7-10.1-2-.6-3.5 4.8-3.5 9" />
        <circle cx="20" cy="24.5" r="7.8" />
      </g>
      <circle cx="17.3" cy="23.6" r="1.25" fill="var(--berry-deep)" />
      <circle cx="22.7" cy="23.6" r="1.25" fill="var(--berry-deep)" />
      <path d="M18.6 27.1c.8.6 2 .6 2.8 0" fill="none" stroke="var(--berry-deep)" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
