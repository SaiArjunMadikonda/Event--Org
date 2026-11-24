import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { EventCard } from "@/components/EventCard";
import { Flash, type SearchParams } from "@/components/Flash";

export default async function DiscoverPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const activity = typeof sp.activity === "string" ? sp.activity : null;

  const events = await prisma.event.findMany({
    where: { startsAt: { gte: new Date() }, status: { not: "CANCELLED" } },
    orderBy: { startsAt: "asc" },
    include: {
      registrations: { where: { status: "REGISTERED" }, select: { userId: true } },
    },
  });
  const activities = [...new Set(events.map((e) => e.activity))].sort();
  const shown = activity ? events.filter((e) => e.activity === activity) : events;

  return (
    <div>
      <Flash searchParams={searchParams} />
      <div className="row between" style={{ marginBottom: "1rem" }}>
        <div>
          <h1>Upcoming activities</h1>
          <p className="muted" style={{ margin: 0 }}>
            Join one and you&apos;ll be placed in a small group before it starts.
          </p>
        </div>
        <Link href="/suggest" className="btn secondary">
          Don&apos;t see what you want? Suggest it
        </Link>
      </div>

      <div className="filters">
        <Link href="/" className={!activity ? "active" : ""}>All</Link>
        {activities.map((a) => (
          <Link key={a} href={`/?activity=${encodeURIComponent(a)}`} className={a === activity ? "active" : ""}>
            {a}
          </Link>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="card muted">No upcoming activities right now.</div>
      ) : (
        <div className="grid">
          {shown.map((e) => (
            <EventCard
              key={e.id}
              event={e}
              registeredCount={e.registrations.length}
              joined={e.registrations.some((r) => r.userId === user.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
