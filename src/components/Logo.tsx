/** Huddle Up mark: three heads leaning in over a shared arc, on a warm tile. */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="logo-mark">
      <defs>
        <linearGradient id="hu-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF8A4C" />
          <stop offset="1" stopColor="#E0362B" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9.5" fill="url(#hu-tile)" />
      <circle cx="9.6" cy="13.4" r="3.1" fill="#FFF4E8" />
      <circle cx="16" cy="10.2" r="3.4" fill="#FFD166" />
      <circle cx="22.4" cy="13.4" r="3.1" fill="#FFF4E8" />
      <path d="M6.2 24.2c2.3-3.9 5.9-5.9 9.8-5.9s7.5 2 9.8 5.9" fill="none" stroke="#FFF4E8" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <span className="logo">
      <LogoMark size={size} />
      <span className="logo-word">
        huddle<span>up</span>
      </span>
    </span>
  );
}
