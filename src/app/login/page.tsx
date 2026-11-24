import { prisma } from "@/lib/db";
import { Flash, type SearchParams } from "@/components/Flash";
import { createAccount, signIn } from "../actions/session";

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const users = await prisma.user.findMany({ orderBy: [{ role: "desc" }, { name: "asc" }] });
  return (
    <div className="stack" style={{ maxWidth: 720, margin: "0 auto" }}>
      <Flash searchParams={searchParams} />
      <div>
        <h1>Find something to do, and people to do it with</h1>
        <p className="muted">
          Join an activity, get placed in a small group with some common ground, and show up with a plan.
        </p>
      </div>

      <div className="callout">
        <strong>Demo sign-in.</strong> This prototype uses fictional accounts and no passwords. Pick anyone below to
        see the app as them. Real sign-in (Supabase Auth) replaces this before launch.
      </div>

      <div className="two-col">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Sign in as</h2>
          <form action={signIn}>
            <div className="field">
              <select name="userId" required defaultValue="">
                <option value="" disabled>
                  Choose a demo account…
                </option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                    {u.role === "ORGANIZER" ? " (organizer)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn" type="submit">Sign in</button>
          </form>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Create an account</h2>
          <form action={createAccount}>
            <div className="field">
              <label htmlFor="name">Name</label>
              <input id="name" name="name" type="text" required />
            </div>
            <div className="field">
              <label htmlFor="email">
                Email <span className="hint">· never shown to other people</span>
              </label>
              <input id="email" name="email" type="email" required />
            </div>
            <div className="field">
              <label htmlFor="city">City</label>
              <input id="city" name="city" type="text" placeholder="e.g. Irving" />
            </div>
            <button className="btn secondary" type="submit">Create account</button>
          </form>
        </div>
      </div>
    </div>
  );
}
