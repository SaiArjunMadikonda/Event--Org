import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { INTEREST_CATEGORIES } from "@/lib/interests";
import { Flash, type SearchParams } from "@/components/Flash";
import { unblockUser, updateProfile } from "../actions/participant";

export default async function ProfilePage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const [interests, mine, blocks] = await Promise.all([
    prisma.interest.findMany({ orderBy: { name: "asc" } }),
    prisma.userInterest.findMany({ where: { userId: user.id } }),
    prisma.block.findMany({ where: { blockerId: user.id }, include: { blocked: { select: { name: true } } } }),
  ]);
  const selected = new Set(mine.map((m) => m.interestId));

  return (
    <div className="stack" style={{ maxWidth: 760 }}>
      <Flash searchParams={searchParams} />
      <h1>Profile &amp; interests</h1>

      <form action={updateProfile} className="stack">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>About you</h2>
          <div className="fields-2">
            <div className="field">
              <label htmlFor="name">Name</label>
              <input id="name" name="name" type="text" defaultValue={user.name} required />
              <span className="hint">Group members see your first name only.</span>
            </div>
            <div className="field">
              <label htmlFor="city">City</label>
              <input id="city" name="city" type="text" defaultValue={user.city} />
              <span className="hint">Used to suggest nearby activities. Not shown to others.</span>
            </div>
          </div>
          <div className="field">
            <label htmlFor="bio">Short bio</label>
            <textarea id="bio" name="bio" maxLength={280} defaultValue={user.bio} />
          </div>
          <label className="check">
            <input type="checkbox" name="shareBioWithGroup" defaultChecked={user.shareBioWithGroup} />
            Show my bio to people in my group
          </label>
          <p className="muted small" style={{ marginTop: "0.5rem" }}>
            Your email ({user.email}) is never shown to other participants.
          </p>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Interests</h2>
          <p className="muted small">
            Used to place you with people who share some of your interests. Group members may see the interests you
            have in common with them.
          </p>
          {INTEREST_CATEGORIES.map((cat) => (
            <fieldset key={cat}>
              <legend>{cat}</legend>
              <div className="check-grid">
                {interests
                  .filter((i) => i.category === cat)
                  .map((i) => (
                    <label key={i.id} className="check">
                      <input type="checkbox" name="interest" value={i.id} defaultChecked={selected.has(i.id)} />
                      {i.name}
                    </label>
                  ))}
              </div>
            </fieldset>
          ))}
        </div>

        <div>
          <button className="btn" type="submit">Save profile</button>
        </div>
      </form>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Blocked people</h2>
        {blocks.length === 0 ? (
          <p className="muted small" style={{ margin: 0 }}>
            You haven&apos;t blocked anyone. You can block someone from your group page; you&apos;ll never be grouped
            with them.
          </p>
        ) : (
          blocks.map((b) => (
            <div key={b.id} className="row between member">
              <span>{b.blocked.name}</span>
              <form action={unblockUser}>
                <input type="hidden" name="userId" value={b.blockedId} />
                <button className="btn secondary small" type="submit">Unblock</button>
              </form>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
