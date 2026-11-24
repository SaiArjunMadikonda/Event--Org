import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { eventStatus, formatDateTime } from "@/lib/format";

export default async function MyEventsPage() {
  const user = await requireUser();
  const regs = await prisma.registration.findMany({
    where: { userId: user.id, status: "REGISTERED" },
    include: {
      event: {
        include: {
          registrations: { where: { status: "REGISTERED" }, select: { id: true } },
          matchingRuns: {
            where: { status: "PUBLISHED" },
            include: { members: { where: { userId: user.id }, include: { group: true } } },
          },
        },
      },
    },
    orderBy: { event: { startsAt: "asc" } },
  });

  const now = new Date();
  const upcoming = regs.filter((r) => r.event.startsAt >= now);
  const past = regs.filter((r) => r.event.startsAt < now);

  const renderList = (list: typeof regs) =>
    list.map((r) => {
      const status = eventStatus(r.event, r.event.registrations.length);
      const run = r.event.matchingRuns[0];
      const group = run?.members[0]?.group;
      return (
        <div key={r.id} className="card row between">
          <div>
            <div className="row">
              <strong>{r.event.title}</strong>
              <span className={`badge ${status.tone}`}>{status.label}</span>
            </div>
            <div className="muted small">
              {formatDateTime(r.event.startsAt)} · {r.event.area}
            </div>
            <div className="small" style={{ marginTop: 4 }}>
              {group ? (
                <span className="badge accent">Group {group.number}</span>
              ) : run ? (
                <span className="badge warn">Not placed in a group — organizer will follow up</span>
              ) : (
                <span className="badge">Group not assigned yet</span>
              )}
            </div>
          </div>
          <div className="row">
            <Link className="btn secondary small" href={`/events/${r.eventId}`}>Details</Link>
            <Link className="btn small" href={`/events/${r.eventId}/group`}>My group</Link>
          </div>
        </div>
      );
    });

  return (
    <div className="stack" style={{ maxWidth: 820 }}>
      <h1>My events</h1>
      {upcoming.length === 0 ? (
        <div className="card muted">
          You haven&apos;t joined any upcoming events. <Link href="/">Browse activities</Link>
        </div>
      ) : (
        renderList(upcoming)
      )}
      {past.length > 0 && (
        <>
          <h2>Past</h2>
          {renderList(past)}
        </>
      )}
    </div>
  );
}
