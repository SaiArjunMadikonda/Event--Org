import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/session";
import { formatDate } from "@/lib/format";
import { Flash, type SearchParams } from "@/components/Flash";
import { Icon } from "@/components/Icon";
import { activityVisual } from "@/lib/activity";
import { updateActivityRequest } from "../../actions/organizer";

export const metadata = { title: "Activity requests" };

export default async function RequestsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireOrganizer();
  const requests = await prisma.activityRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true } } },
  });

  // Group similar requests by activity name (case-insensitive) so demand is easy to spot.
  const byActivity = new Map<string, typeof requests>();
  for (const r of requests) {
    const key = r.activity.trim().toLowerCase();
    byActivity.set(key, [...(byActivity.get(key) ?? []), r]);
  }
  const clusters = [...byActivity.values()].sort((a, b) => b.length - a.length);

  return (
    <div className="stack">
      <Flash searchParams={searchParams} />
      <Link href="/organizer" className="back" style={{ marginBottom: 0 }}><Icon name="arrowLeft" size={16} /> Dashboard</Link>
      <div className="row between">
        <div>
          <div className="eyebrow"><Icon name="bulb" size={15} /> Ideas from members</div>
          <h1 style={{ margin: 0 }}>Activity requests</h1>
          <p className="muted" style={{ margin: 0 }}>
            What people want to do, grouped by activity. Requests are signals of interest, not bookings.
          </p>
        </div>
        <Link href="/organizer/events/new" className="btn"><Icon name="plus" size={17} /> Create event from demand</Link>
      </div>

      {clusters.length === 0 && (
        <div className="empty"><span className="emoji">💡</span><h3>No ideas yet</h3><p>When members suggest activities, they&apos;ll be grouped here.</p></div>
      )}

      {clusters.map((list) => (
        <div key={list[0].id} className="card">
          <div className="row between">
            <h2 style={{ margin: 0 }} className="row">
              <span className="emoji-tile tint" style={{ ["--h" as string]: activityVisual(list[0].activity).hue, width: 40, height: 40, fontSize: "1.2rem", borderRadius: 12 }}>
                {activityVisual(list[0].activity).emoji}
              </span>
              {list[0].activity}
            </h2>
            <span className="badge accent">{list.length} request{list.length === 1 ? "" : "s"}</span>
          </div>
          {list.map((r) => (
            <div key={r.id} className="member">
              <div className="row between">
                <div>
                  <strong>{r.user.name}</strong>{" "}
                  <span className="small muted">· {formatDate(r.createdAt)}</span>
                  <div className="small">
                    {r.experienceLevel} · {r.area} · {r.timeWindow}
                    {r.budgetMax !== null ? ` · under $${r.budgetMax}` : ""} · {r.groupSizeMin}–{r.groupSizeMax} people
                  </div>
                  {r.notes && <div className="small muted">“{r.notes}”</div>}
                </div>
                <form action={updateActivityRequest} className="row" style={{ alignItems: "flex-start" }}>
                  <input type="hidden" name="requestId" value={r.id} />
                  <select name="status" defaultValue={r.status} style={{ width: "auto" }}>
                    <option value="NEW">New</option>
                    <option value="REVIEWING">Reviewing</option>
                    <option value="PLANNED">Planned</option>
                    <option value="DECLINED">Declined</option>
                  </select>
                  <input
                    name="organizerNote"
                    type="text"
                    defaultValue={r.organizerNote}
                    placeholder="Note to requester (optional)"
                    style={{ width: 220 }}
                  />
                  <button className="btn secondary small" type="submit">Save</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
