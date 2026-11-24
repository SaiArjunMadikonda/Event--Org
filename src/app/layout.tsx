import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getCurrentUser } from "@/lib/session";
import { signOut } from "./actions/session";

export const metadata: Metadata = {
  title: "Community Events & Group Matching",
  description: "Turn an interest into a real plan with a small group of people.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="en">
      <body>
        <nav className="nav">
          <div className="nav-inner">
            <Link href="/" className="brand">
              Community<span>Events</span>
            </Link>
            {user && (
              <div className="nav-links">
                <Link href="/">Discover</Link>
                <Link href="/my-events">My Events</Link>
                <Link href="/suggest">Suggest an Activity</Link>
                <Link href="/profile">Profile</Link>
                {user.role === "ORGANIZER" && <Link href="/organizer">Organizer</Link>}
              </div>
            )}
            {user ? (
              <div className="nav-user">
                <span>{user.name}</span>
                <form action={signOut} className="inline">
                  <button className="btn link small" type="submit">Switch user</button>
                </form>
              </div>
            ) : (
              <div className="nav-user">
                <Link href="/login">Sign in</Link>
              </div>
            )}
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
