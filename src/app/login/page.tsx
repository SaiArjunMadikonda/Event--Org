import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, isDemoLoginEnabled } from "@/lib/session";
import { isAuthConfigured } from "@/lib/supabase/server";
import { Flash, type SearchParams } from "@/components/Flash";
import { sendMagicLink, signInDemo, signInWithGoogle } from "../actions/session";

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  if (await getCurrentUser()) redirect("/");
  const demo = isDemoLoginEnabled();
  const authReady = isAuthConfigured();
  const demoUsers = demo ? await prisma.user.findMany({ orderBy: [{ role: "desc" }, { name: "asc" }] }) : [];

  return (
    <div className="stack" style={{ maxWidth: 720, margin: "0 auto" }}>
      <Flash searchParams={searchParams} />
      <div>
        <h1>Find something to do, and people to do it with</h1>
        <p className="muted">
          Join an activity, get placed in a small group with some common ground, and show up with a plan.
        </p>
      </div>

      <div className="card" style={{ maxWidth: 420 }}>
        <h2 style={{ marginTop: 0 }}>Sign in or create an account</h2>
        {!authReady && (
          <p className="callout small">
            Sign-in isn&apos;t set up yet. Add the Supabase publishable key to <code>.env</code> and restart the app.
          </p>
        )}

        <form action={signInWithGoogle}>
          <button className="btn secondary" type="submit" style={{ width: "100%" }} disabled={!authReady}>
            Continue with Google
          </button>
        </form>

        <p className="small muted" style={{ textAlign: "center", margin: "1rem 0" }}>or</p>

        <form action={sendMagicLink}>
          <div className="field">
            <label htmlFor="email">
              Email <span className="hint">· never shown to other people</span>
            </label>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <button className="btn" type="submit" style={{ width: "100%" }} disabled={!authReady}>
            Email me a sign-in link
          </button>
        </form>
        <p className="small muted" style={{ marginBottom: 0 }}>
          No password needed. New here? The same link creates your account. Open it in this browser.
        </p>
      </div>

      {demo && (
        <div className="card" style={{ maxWidth: 420 }}>
          <h2 style={{ marginTop: 0 }}>Demo accounts</h2>
          <p className="small muted">
            For testing only (DEMO_LOGIN is on). Sign in as a fictional person without a password.
          </p>
          <form action={signInDemo}>
            <div className="field">
              <select name="userId" required defaultValue="">
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
            </div>
            <button className="btn secondary" type="submit">Sign in as demo user</button>
          </form>
        </div>
      )}
    </div>
  );
}
