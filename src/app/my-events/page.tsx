import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { eventDateParts, eventStatus, formatEventTime } from "@/lib/format";
import { activityVisual } from "@/lib/activity";
import { Icon } from "@/components/Icon";

export const metadata = { title: "My events" };

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
  const past = regs.filter((r) => r.event.startsAt < now).reverse();

  const renderList = (list: typeof regs, isPast = false) => (
    <div className="stack">
      {list.map((r) => {
        const status = eventStatus(r.event, r.event.registrations.length);
        const run = r.event.matchingRuns[0];
        const group = run?.members[0]?.group;
        const { emoji, hue } = activityVisual(r.event.activity);
        const date = eventDateParts(r.event.startsAt, r.event.timeZone);
        return (
          <div key={r.id} className="card list-card" style={isPast ? { opacity: 0.75 } : undefined}>
            <div className="tint" style={{ ["--h" as string]: hue, borderRadius: 16, padding: "0.55rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <span className="emoji-tile" style={{ width: 46, height: 46, fontSize: "1.4rem" }} aria-hidden="true">{emoji}</span>
              <span className="date-pill">
                <span className="m">{date.month}</span>
                <span className="d">{date.day}</span>
                <span className="w">{date.weekday}</span>
              </span>
            </div>
            <div className="lc-main">
              <div className="lc-title"><Link href={`/events/${r.eventId}`}>{r.event.title}</Link></div>
              <div className="muted small" style={{ display: "flex", gap: "0.9rem", flexWrap: "wrap" }}>
                <span><Icon name="clock" size={14} /> {formatEventTime(r.event.startsAt, r.event.timeZone)}</span>
                <span><Icon name="pin" size={14} /> {r.event.area}</span>
              </div>
              <div className="row" style={{ gap: "0.4rem", marginTop: "0.5rem" }}>
                <span className={`badge ${status.tone}`}>{status.label}</span>
                {group ? (
                  <span className="badge accent">Group {group.number}</span>
                ) : run ? (
                  <span className="badge warn">Not placed yet, organizer will follow up</span>
                ) : (
                  <span className="badge plain">Group coming soon</span>
                )}
              </div>
            </div>
            <div className="row" style={{ gap: "0.5rem" }}>
              <Link className="btn secondary small" href={`/events/${r.eventId}`}>Details</Link>
              <Link className="btn small" href={`/events/${r.eventId}/group`}>
                <Icon name="users" size={15} /> My group
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <div className="page-head">
        <div>
          <h1>My events</h1>
          <p>Everything you&apos;ve joined, and the group you&apos;re in for each.</p>
        </div>
        <Link href="/" className="btn secondary"><Icon name="plus" size={16} /> Find more</Link>
      </div>

      {upcoming.length === 0 ? (
        <div className="empty">
          <span className="emoji">🗓️</span>
          <h3>No plans yet</h3>
          <p>Pick an activity and we&apos;ll put you in a small group for it.</p>
          <Link href="/" className="btn">Browse activities</Link>
        </div>
      ) : (
        renderList(upcoming)
      )}
      {past.length > 0 && (
        <>
          <h2 style={{ marginTop: "2.2rem" }}>Past</h2>
          {renderList(past, true)}
        </>
      )}
    </div>
  );
}
