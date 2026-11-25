import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { formatDate } from "@/lib/format";
import { Flash, type SearchParams } from "@/components/Flash";
import { FormMemory } from "@/components/FormMemory";
import { Icon } from "@/components/Icon";
import { activityVisual } from "@/lib/activity";
import { submitActivityRequest } from "../actions/participant";

export const metadata = { title: "Suggest an activity" };

const STATUS_TEXT: Record<string, { label: string; tone: string }> = {
  NEW: { label: "Sent", tone: "info" },
  REVIEWING: { label: "Organizer reviewing", tone: "accent" },
  PLANNED: { label: "Being planned", tone: "ok" },
  DECLINED: { label: "Not planned", tone: "" },
};

export default async function SuggestPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const requests = await prisma.activityRequest.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="two-col">
      <div className="stack">
        <Flash searchParams={searchParams} />
        <div>
          <div className="eyebrow"><Icon name="bulb" size={15} /> Your idea</div>
          <h1>Suggest an activity</h1>
          <p className="muted">
            Tell us what you&apos;d like to do. Organizers look at similar requests together to decide what to plan
            next.
          </p>
        </div>
        <FormMemory formId="suggest-activity" />
        <form id="suggest-activity" action={submitActivityRequest} className="card">
          <div className="fields-2">
            <div className="field">
              <label htmlFor="activity">Activity</label>
              <input id="activity" name="activity" type="text" placeholder="e.g. Badminton" required />
            </div>
            <div className="field">
              <label htmlFor="experienceLevel">Experience level</label>
              <select id="experienceLevel" name="experienceLevel" defaultValue="Any">
                <option>Any</option>
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="area">Location</label>
              <input id="area" name="area" type="text" placeholder="e.g. Irving" defaultValue={user.city} required />
            </div>
            <div className="field">
              <label htmlFor="timeWindow">When</label>
              <input id="timeWindow" name="timeWindow" type="text" placeholder="e.g. Saturday morning" required />
            </div>
            <div className="field">
              <label htmlFor="budgetMax">
                Budget <span className="hint">· max $ per person, optional</span>
              </label>
              <input id="budgetMax" name="budgetMax" type="number" min={0} step={1} placeholder="20" />
            </div>
            <div className="field">
              <label>Preferred group size</label>
              <div className="row" style={{ flexWrap: "nowrap" }}>
                <input name="groupSizeMin" type="number" min={2} max={50} defaultValue={4} aria-label="Minimum group size" required />
                <span className="muted">to</span>
                <input name="groupSizeMax" type="number" min={2} max={50} defaultValue={6} aria-label="Maximum group size" required />
              </div>
            </div>
          </div>
          <div className="field">
            <label htmlFor="notes">
              Anything else? <span className="hint">· optional</span>
            </label>
            <textarea id="notes" name="notes" maxLength={500} placeholder="e.g. Would love a regular weekly game." />
          </div>
          <button className="btn large" type="submit"><Icon name="sparkles" /> Send my idea</button>
          <p className="muted small" style={{ margin: "0.6rem 0 0" }}>
            This is a signal of interest, not a booking. We can&apos;t promise an event will happen, but organizers use
            these requests to decide what to plan.
          </p>
        </form>
      </div>

      <div className="card sticky">
        <h2 className="card-title"><Icon name="inbox" /> Your ideas</h2>
        {requests.length === 0 ? (
          <p className="muted small" style={{ margin: 0 }}>Nothing sent yet. Your ideas and their status will show up here.</p>
        ) : (
          requests.map((r) => {
            const s = STATUS_TEXT[r.status] ?? STATUS_TEXT.NEW;
            return (
              <div key={r.id} className="member">
                <div className="row between">
                  <strong>{activityVisual(r.activity).emoji} {r.activity}</strong>
                  <span className={`badge ${s.tone}`}>{s.label}</span>
                </div>
                <div className="small muted">
                  {r.experienceLevel} · {r.area} · {r.timeWindow}
                  {r.budgetMax !== null ? ` · under $${r.budgetMax}` : ""} · {r.groupSizeMin}–{r.groupSizeMax} people
                </div>
                {r.organizerNote && <div className="small">Organizer: {r.organizerNote}</div>}
                <div className="small muted">Sent {formatDate(r.createdAt)}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
