/** Small line icons (24×24, stroke uses currentColor). */
const PATHS = {
  calendar: <><rect x="3" y="4.5" width="18" height="17" rx="2.5" /><path d="M16 2.5v4M8 2.5v4M3 10h18" /></>,
  clock: <><circle cx="12" cy="12" r="9.5" /><path d="M12 7v5l3.5 2" /></>,
  pin: <><path d="M19.5 10c0 5.5-7.5 11.5-7.5 11.5S4.5 15.5 4.5 10a7.5 7.5 0 0 1 15 0Z" /><circle cx="12" cy="10" r="2.75" /></>,
  tag: <><path d="M12.6 2.6H3.5a1 1 0 0 0-1 1v9.1l9.3 9.3a1.4 1.4 0 0 0 2 0l7.7-7.7a1.4 1.4 0 0 0 0-2Z" /><circle cx="7.5" cy="7.5" r="1.6" /></>,
  users: <><path d="M16 20.5v-1.8a3.8 3.8 0 0 0-3.8-3.8H6.3a3.8 3.8 0 0 0-3.8 3.8v1.8" /><circle cx="9.2" cy="7.5" r="3.8" /><path d="M21.5 20.5v-1.8a3.8 3.8 0 0 0-2.8-3.6M15.8 3.9a3.8 3.8 0 0 1 0 7.2" /></>,
  sparkles: <><path d="M11 3.5 12.9 8.6 18 10.5l-5.1 1.9L11 17.5l-1.9-5.1L4 10.5l5.1-1.9Z" /><path d="M19 3v3M17.5 4.5h3M19 16v4M17 18h4" /></>,
  arrowRight: <path d="M4.5 12h15M13.5 6l6 6-6 6" />,
  arrowLeft: <path d="M19.5 12h-15M10.5 6l-6 6 6 6" />,
  check: <path d="M20 6.5 9.5 17 4 11.5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  logout: <><path d="M9 20.5H5.5a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2H9M16 16.5l4.5-4.5L16 7.5M20.5 12H9" /></>,
  shield: <path d="M12 21.5s7.5-3.6 7.5-9.4V5.3L12 2.5 4.5 5.3v6.8c0 5.8 7.5 9.4 7.5 9.4Z" />,
  mail: <><rect x="2.5" y="4.5" width="19" height="15" rx="2.5" /><path d="m21.5 7.5-9.5 6-9.5-6" /></>,
  heart: <path d="M12 20.5s-8.5-5-8.5-11A4.8 4.8 0 0 1 12 6.6a4.8 4.8 0 0 1 8.5 2.9c0 6-8.5 11-8.5 11Z" />,
  flag: <><path d="M4.5 15s1-1 4-1 5 2 8 2 3-.9 3-.9V3.6s-.9.9-3 .9-5-2-8-2-4 1-4 1Z" /><path d="M4.5 21.5V15" /></>,
  bulb: <><path d="M9 18h6M10 21.5h4" /><path d="M12 2.5a6.5 6.5 0 0 0-4 11.6c.7.6 1 1.4 1 2.2V17h6v-.7c0-.8.3-1.6 1-2.2A6.5 6.5 0 0 0 12 2.5Z" /></>,
  grid: <><rect x="3" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" /></>,
  inbox: <><path d="M21.5 12.5h-6l-2 3h-3l-2-3h-6" /><path d="M5.8 5.6 2.5 12.5v5.5a2 2 0 0 0 2 2h15a2 2 0 0 0 2-2v-5.5l-3.3-6.9a2 2 0 0 0-1.8-1.1H7.6a2 2 0 0 0-1.8 1.1Z" /></>,
  user: <><circle cx="12" cy="8" r="4.5" /><path d="M3.5 21.5a8.5 8.5 0 0 1 17 0" /></>,
  ticket: <><path d="M3 8.5V6a1.5 1.5 0 0 1 1.5-1.5h15A1.5 1.5 0 0 1 21 6v2.5a2.5 2.5 0 0 0 0 5V16a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16v-2.5a2.5 2.5 0 0 0 0-5Z" /><path d="M14 4.5v13" strokeDasharray="2 2.5" /></>,
  eye: <><path d="M1.5 12S5.5 4.5 12 4.5 22.5 12 22.5 12 18.5 19.5 12 19.5 1.5 12 1.5 12Z" /><circle cx="12" cy="12" r="3" /></>,
  alert: <><path d="M10.3 3.9 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>,
  globe: <><circle cx="12" cy="12" r="9.5" /><path d="M2.5 12h19M12 2.5a14.5 14.5 0 0 1 0 19 14.5 14.5 0 0 1 0-19Z" /></>,
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={className ? `icon ${className}` : "icon"}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}

export function GoogleLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5Z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7Z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A11.9 11.9 0 0 1 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44Z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5Z" />
    </svg>
  );
}
