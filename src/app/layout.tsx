import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { getCurrentUser } from "@/lib/session";
import { Logo } from "@/components/Logo";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { NavLinks } from "@/components/NavLinks";
import { signOut } from "./actions/session";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" });
const body = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Huddle Up · Find your people, make a plan", template: "%s · Huddle Up" },
  description: "Join a local activity and get placed in a small group with some common ground before it starts.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff8f1" },
    { media: "(prefers-color-scheme: dark)", color: "#15111d" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const links = user
    ? [
        { href: "/", label: "Discover" },
        { href: "/my-events", label: "My events" },
        { href: "/suggest", label: "Suggest" },
        { href: "/profile", label: "Profile" },
        user.role === "ORGANIZER" ? { href: "/organizer", label: "Organizer" } : { href: "/organize", label: "Host events" },
      ]
    : [];

  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <nav className="nav">
          <div className="nav-inner">
            <Link href="/" className="brand" aria-label="Huddle Up home">
              <Logo />
            </Link>
            {user && <NavLinks links={links} />}
            {user && (
              <div className="nav-user">
                <Link href="/profile" className="who" style={{ textDecoration: "none" }}>
                  <Avatar name={user.name} size={34} />
                  <span className="who-name">{user.name.split(" ")[0]}</span>
                </Link>
                <form action={signOut} className="inline">
                  <button className="icon-btn" type="submit" title="Sign out" aria-label="Sign out">
                    <Icon name="logout" size={17} />
                  </button>
                </form>
              </div>
            )}
          </div>
        </nav>
        <main>{children}</main>
        <footer className="footer">
          <div className="footer-inner">
            <span className="logo-word">huddle<span>up</span></span>
            <span>Small groups, real plans. Your email is never shown to other people.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
