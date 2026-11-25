/** Decorative illustration: a small group gathered around a shared table. */
export function HuddleArt({ className }: { className?: string }) {
  const people = [
    { x: 58, y: 112, skin: "#F2B48C", shirt: "#FF7A4D", hair: "#3B1F5C" },
    { x: 112, y: 86, skin: "#8D5A3B", shirt: "#FFD166", hair: "#22192E" },
    { x: 170, y: 78, skin: "#F6CBA5", shirt: "#7AD3B0", hair: "#B5562B" },
    { x: 228, y: 86, skin: "#C98D63", shirt: "#9F8BF2", hair: "#22192E" },
    { x: 282, y: 112, skin: "#E9A97F", shirt: "#FF9EC1", hair: "#5A2A12" },
  ];
  return (
    <svg className={className} viewBox="0 0 340 230" fill="none" aria-hidden="true">
      <ellipse cx="170" cy="200" rx="150" ry="22" fill="#000" opacity="0.12" />
      {people.map((p, i) => (
        <g key={i}>
          <path d={`M${p.x - 30} ${p.y + 78} q0 -46 30 -46 q30 0 30 46 z`} fill={p.shirt} />
          <circle cx={p.x} cy={p.y} r="19" fill={p.skin} />
          <path d={`M${p.x - 19} ${p.y - 2} a19 19 0 0 1 38 0 q-6 -9 -19 -9 q-13 0 -19 9 z`} fill={p.hair} />
        </g>
      ))}
      <rect x="40" y="168" width="260" height="22" rx="11" fill="#FFF4E8" />
      <rect x="40" y="168" width="260" height="8" rx="4" fill="#FFFFFF" opacity="0.7" />
      <g transform="translate(150 132)">
        <rect width="40" height="28" rx="9" fill="#FFFFFF" />
        <path d="M12 28 l-2 9 l9 -9 z" fill="#FFFFFF" />
        <circle cx="12" cy="14" r="2.6" fill="#E0362B" />
        <circle cx="20" cy="14" r="2.6" fill="#FFB347" />
        <circle cx="28" cy="14" r="2.6" fill="#7AD3B0" />
      </g>
      <path d="M30 40 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4 z" fill="#FFD166" />
      <path d="M300 28 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 z" fill="#FFFFFF" opacity="0.85" />
      <circle cx="318" cy="70" r="4" fill="#FF7A4D" />
      <circle cx="20" cy="96" r="3" fill="#FFFFFF" opacity="0.7" />
    </svg>
  );
}
