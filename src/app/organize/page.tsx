import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { formatDate } from "@/lib/format";
import { APPLICATION_LIMITS, onboardingState } from "@/lib/organizers";
import { Flash, type SearchParams } from "@/components/Flash";
import { FormMemory } from "@/components/FormMemory";
import { Icon } from "@/components/Icon";
import { applyToOrganize } from "../actions/onboarding";

export const metadata = { title: "Host events" };

export default async function OrganizePage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const latest = await prisma.organizerApplication.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  const state = onboardingState(user.role, latest);

  return (
    <div className="two-col">
      <div className="stack">
        <Flash searchParams={searchParams} />
        <div>
          <div className="eyebrow"><Icon name="sparkles" size={15} /> Host on Huddle Up</div>
          <h1>Become an organizer</h1>
          <p className="muted">
            Organizers create events, choose group sizes, and review the groups the app suggests before anyone sees
            them. Tell us a little about what you&apos;d like to run, and an existing organizer will review it.
          </p>
        </div>

        {state === "ORGANIZER" && (
          <div className="card">
            <p style={{ marginTop: 0 }}>
              <span className="badge ok">You&apos;re an organizer</span>
            </p>
            <Link href="/organizer" className="btn">Go to the organizer dashboard</Link>
          </div>
        )}

        {state === "PENDING" && latest && (
          <div className="card">
            <p style={{ marginTop: 0 }}>
              <span className="badge warn">Waiting for review</span>
            </p>
            <p className="small muted">Sent {formatDate(latest.createdAt)}. You&apos;ll see the decision here.</p>
            <dl className="meta">
              <dt>Plans</dt>
              <dd>{latest.plans}</dd>
              <dt>Area</dt>
              <dd>{latest.area}</dd>
              {latest.experience && (
                <>
                  <dt>Experience</dt>
                  <dd>{latest.experience}</dd>
                </>
              )}
            </dl>
          </div>
        )}

        {state === "CAN_APPLY" && (
          <>
            {latest?.status === "DECLINED" && (
              <div className="callout">
                Your application from {formatDate(latest.createdAt)} wasn&apos;t approved.
                {latest.reviewerNote && <> Organizer&apos;s note: “{latest.reviewerNote}”</>} You&apos;re welcome to
                apply again.
              </div>
            )}
            <FormMemory formId="organizer-application" />
            <form id="organizer-application" action={applyToOrganize} className="card">
              <div className="field">
                <label htmlFor="plans">What would you like to organize?</label>
                <textarea
                  id="plans"
                  name="plans"
                  maxLength={APPLICATION_LIMITS.plans}
                  placeholder="e.g. A monthly board game afternoon for beginners, groups of 4–6."
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="area">Where?</label>
                <input
                  id="area"
                  name="area"
                  type="text"
                  maxLength={APPLICATION_LIMITS.area}
                  defaultValue={user.city}
                  placeholder="e.g. Irving"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="experience">
                  Anything you&apos;ve organized before? <span className="hint">· optional</span>
                </label>
                <textarea
                  id="experience"
                  name="experience"
                  maxLength={APPLICATION_LIMITS.experience}
                  placeholder="e.g. I run a weekly pickup soccer game with about 12 people."
                />
              </div>
              <button className="btn" type="submit">Send application</button>
            </form>
          </>
        )}
      </div>

      <div className="card sticky">
        <h2 className="card-title"><Icon name="grid" /> What organizers do</h2>
        <div className="steps" style={{ marginTop: 0 }}>
          <div><span className="emoji-tile" aria-hidden="true">📅</span><div><strong>Create events</strong><span>Time, area, meeting point and group size.</span></div></div>
          <div><span className="emoji-tile" aria-hidden="true">🧩</span><div><strong>Review groups</strong><span>Preview suggested groups and publish when they look right.</span></div></div>
          <div><span className="emoji-tile" aria-hidden="true">💡</span><div><strong>Follow demand</strong><span>See what members are asking to do.</span></div></div>
          <div><span className="emoji-tile" aria-hidden="true">🛡️</span><div><strong>Keep it safe</strong><span>Handle reports about your events.</span></div></div>
        </div>
        <p className="small muted" style={{ margin: "0.75rem 0 0" }}>
          Organizers can see attendees&apos; names and shared interests for their own events, but never email addresses.
        </p>
      </div>
    </div>
  );
}
