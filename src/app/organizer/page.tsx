import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/session";
import { eventStatus, formatDate, formatEventDateTime } from "@/lib/format";
import { Flash, type SearchParams } from "@/components/Flash";
import { Icon } from "@/components/Icon";
import { activityVisual } from "@/lib/activity";
import { resolveReport } from "../actions/organizer";

export const metadata = { title: "Organizer" };

export default async function OrganizerDashboard({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireOrganizer();
  const [events, newRequests, reports, pendingApplications] = await Promise.all([
    prisma.event.findMany({
      where: { organizerId: user.id },
      orderBy: { startsAt: "asc" },
      include: {
        registrations: { where: { status: "REGISTERED" }, select: { id: true } },
        matchingRuns: { where: { status: { in: ["PREVIEW", "PUBLISHED"] } }, select: { status: true } },
      },
    }),
    prisma.activityRequest.count({ where: { status: "NEW" } }),
    prisma.report.findMany({
      where: { status: "OPEN", OR: [{ eventId: null }, { event: { organizerId: user.id } }] },
      include: {
        reporter: { select: { name: true } },
        reportedUser: { select: { name: true } },
        event: { select: { title: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.organizerApplication.count({ where: { status: "PENDING" } }),
  ]);

  const upcoming = events.filter((e) => e.startsAt >= new Date());
  const totalRegs = upcoming.reduce((s, e) => s + e.registrations.length, 0);

  return (
    <div className="stack">
      <Flash searchParams={searchParams} />
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <div className="eyebrow"><Icon name="grid" size={15} /> Organizer</div>
          <h1>Hey {user.name.split(" ")[0]}, here&apos;s your huddle HQ</h1>
          <p>Create activities, review groups before anyone sees them, and keep an eye on what people want.</p>
        </div>
        <div className="row">
          <Link href="/organizer/applications" className="btn secondary">
            <Icon name="user" size={16} /> Applications
            {pendingApplications > 0 && <span className="badge accent plain">{pendingApplications}</span>}
          </Link>
          <Link href="/organizer/requests" className="btn secondary">
            <Icon name="bulb" size={16} /> Ideas
            {newRequests > 0 && <span className="badge accent plain">{newRequests} new</span>}
          </Link>
          <Link href="/organizer/events/new" className="btn"><Icon name="plus" size={17} /> Create event</Link>
        </div>
      </div>

      <div className="stats">
        <div className="card stat-card"><span className="si"><Icon name="calendar" size={20} /></span><div><div className="stat">{upcoming.length}</div><div className="muted small">Upcoming events</div></div></div>
        <div className="card stat-card ok"><span className="si"><Icon name="ticket" size={20} /></span><div><div className="stat">{totalRegs}</div><div className="muted small">Registrations</div></div></div>
        <div className="card stat-card info"><span className="si"><Icon name="bulb" size={20} /></span><div><div className="stat">{newRequests}</div><div className="muted small">New activity ideas</div></div></div>
        <div className="card stat-card warn"><span className="si"><Icon name="flag" size={20} /></span><div><div className="stat">{reports.length}</div><div className="muted small">Open reports</div></div></div>
      </div>

      <div className="card">
        <h2 className="card-title"><Icon name="calendar" /> Your events</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>When</th>
                <th>Registered</th>
                <th>Groups</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    No events yet. Use <Link href="/organizer/events/new">+ Create event</Link> to plan your first one.
                  </td>
                </tr>
              )}
              {events.map((e) => {
                const status = eventStatus(e, e.registrations.length);
                const published = e.matchingRuns.some((r) => r.status === "PUBLISHED");
                const preview = e.matchingRuns.some((r) => r.status === "PREVIEW");
                return (
                  <tr key={e.id}>
                    <td>
                      <Link href={`/organizer/events/${e.id}`} className="cell-title" style={{ color: "var(--text)" }}>
                        <span className="emoji-tile tint" style={{ ["--h" as string]: activityVisual(e.activity).hue }}>
                          {activityVisual(e.activity).emoji}
                        </span>
                        {e.title}
                      </Link>
                    </td>
                    <td>{formatEventDateTime(e.startsAt, e.timeZone)}</td>
                    <td>{e.registrations.length} / {e.capacity}</td>
                    <td>
                      {published ? <span className="badge accent">Published</span> : preview ? <span className="badge warn">Preview ready</span> : <span className="muted small">—</span>}
                    </td>
                    <td><span className={`badge ${status.tone}`}>{status.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {reports.length > 0 && (
        <div className="card">
          <h2 className="card-title"><Icon name="flag" /> Open reports</h2>
          {reports.map((r) => (
            <div key={r.id} className="member row between">
              <div>
                <div className="small muted">
                  {formatDate(r.createdAt)} · from {r.reporter.name}
                  {r.reportedUser ? ` about ${r.reportedUser.name}` : ""}
                  {r.event ? ` · ${r.event.title}` : ""}
                </div>
                <div>{r.reason}</div>
              </div>
              <form action={resolveReport}>
                <input type="hidden" name="reportId" value={r.id} />
                <button className="btn secondary small" type="submit">Mark resolved</button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
