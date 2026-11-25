"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const path = usePathname();
  const isActive = (href: string) =>
    href === "/" ? path === "/" || path.startsWith("/events") : path === href || path.startsWith(href + "/");
  return (
    <div className="nav-links">
      {links.map((l) => (
        <Link key={l.href} href={l.href} className={isActive(l.href) ? "active" : ""}>
          {l.label}
        </Link>
      ))}
    </div>
  );
}
