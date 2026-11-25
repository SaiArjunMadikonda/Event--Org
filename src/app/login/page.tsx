import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, isDemoLoginEnabled } from "@/lib/session";
import { isAuthConfigured } from "@/lib/supabase/server";
import { Flash, type SearchParams } from "@/components/Flash";
import { GoogleLogo, Icon } from "@/components/Icon";
import { sendMagicLink, signInDemo, signInWithGoogle } from "../actions/session";

export const metadata = { title: "Sign in" };

const STEPS = [
  { emoji: "🎯", title: "Pick something to do", text: "Movie nights, badminton, board games, coffee, walks." },
  { emoji: "🧩", title: "Get matched into a small group", text: "We place you with a few people who share some of your interests." },
  { emoji: "🙌", title: "Show up with a plan", text: "Know where to meet and who to look for before you arrive." },
];

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  if (await getCurrentUser()) redirect("/");
  const demo = isDemoLoginEnabled();
  const authReady = isAuthConfigured();
  const demoUsers = demo ? await prisma.user.findMany({ orderBy: [{ role: "desc" }, { name: "asc" }] }) : [];

  return (
    <div className="auth">
      <section className="auth-pitch">
        <div className="eyebrow"><Icon name="sparkles" size={15} /> Small groups, real plans</div>
        <h1>
          Find your people. <em>Huddle up.</em>
        </h1>
        <p className="lead">
          Turn &ldquo;I&apos;d love to do that sometime&rdquo; into an actual plan, with a small group that has some
          common ground with you.
        </p>
        <div className="steps">
          {STEPS.map((s) => (
            <div key={s.title}>
              <span className="emoji-tile" aria-hidden="true">{s.emoji}</span>
              <div>
                <strong>{s.title}</strong>
                <span>{s.text}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="stack">
        <Flash searchParams={searchParams} />
        <div className="card auth-card">
          <h2>Welcome</h2>
          <p className="muted" style={{ marginBottom: "1.4rem" }}>Sign in or create an account in a few seconds.</p>

          {!authReady && (
            <p className="callout warn small">
              Sign-in isn&apos;t set up yet. Add the Supabase publishable key to <code>.env</code> and restart the app.
            </p>
          )}

          <form action={signInWithGoogle}>
            <button className="btn google block large" type="submit" disabled={!authReady}>
              <GoogleLogo size={20} /> Continue with Google
            </button>
          </form>

          <div className="divider">or use your email</div>

          <form action={sendMagicLink}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
            </div>
            <button className="btn block large" type="submit" disabled={!authReady}>
              <Icon name="mail" /> Email me a sign-in link
            </button>
          </form>
          <p className="fine">
            <Icon name="shield" size={15} />
            <span>No password needed, and new accounts are created automatically. Your email is never shown to other people.</span>
          </p>
        </div>

        {demo && (
          <div className="card soft">
            <h3 className="card-title"><Icon name="users" /> Demo accounts</h3>
            <p className="small muted">For testing only. Sign in as a fictional person without a password.</p>
            <form action={signInDemo} className="row" style={{ flexWrap: "nowrap" }}>
              <select name="userId" required defaultValue="" aria-label="Demo account">
                <option value="" disabled>
                  Choose a demo account…
                </option>
                {demoUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                    {u.role === "ORGANIZER" ? " (organizer)" : ""}
                  </option>
                ))}
              </select>
              <button className="btn secondary" type="submit">Go</button>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}
