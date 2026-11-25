import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { formatDate } from "@/lib/format";
import { APPLICATION_LIMITS, onboardingState } from "@/lib/organizers";
import { Flash, type SearchParams } from "@/components/Flash";
import { FormMemory } from "@/components/FormMemory";
import { applyToOrganize } from "../actions/onboarding";

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

      <div className="card">
        <h2 style={{ marginTop: 0 }}>What organizers do</h2>
        <ul className="small" style={{ paddingLeft: "1.1rem", margin: 0 }}>
          <li>Create events with a time, area, meeting point and group size.</li>
          <li>Preview suggested groups and publish them when they look right.</li>
          <li>Read activity requests to see what people want to do.</li>
          <li>Handle reports about their events.</li>
        </ul>
        <p className="small muted" style={{ margin: "0.75rem 0 0" }}>
          Organizers can see attendees&apos; names and shared interests for their own events, but never email addresses.
        </p>
      </div>
    </div>
  );
}
