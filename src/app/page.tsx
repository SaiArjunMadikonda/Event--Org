import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { firstName } from "@/lib/format";
import { activityVisual } from "@/lib/activity";
import { EventCard } from "@/components/EventCard";
import { Flash, type SearchParams } from "@/components/Flash";
import { HuddleArt } from "@/components/HuddleArt";
import { Icon } from "@/components/Icon";

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
  const joinedCount = events.filter((e) => e.registrations.some((r) => r.userId === user.id)).length;
  const openSpots = events.reduce((s, e) => s + Math.max(0, e.capacity - e.registrations.length), 0);

  return (
    <div>
      <Flash searchParams={searchParams} />

      <section className="hero">
        <div className="eyebrow"><Icon name="sparkles" size={15} /> Hey {firstName(user.name)}</div>
        <h1>What are you up for this week?</h1>
        <p>Join an activity and we&apos;ll place you in a small group with some common ground before it starts.</p>
        <div className="hero-actions">
          <Link href="#activities" className="btn">Browse activities <Icon name="arrowRight" size={17} /></Link>
          <Link href="/suggest" className="btn secondary"><Icon name="bulb" size={17} /> Suggest an idea</Link>
        </div>
        <div className="hero-stats">
          <div><strong>{events.length}</strong>upcoming activities</div>
          <div><strong>{openSpots}</strong>open spots</div>
          <div><strong>{joinedCount}</strong>you&apos;ve joined</div>
        </div>
        <HuddleArt className="hero-art" />
      </section>

      <div id="activities" className="page-head" style={{ marginBottom: "1rem", scrollMarginTop: 90 }}>
        <div>
          <h2 style={{ margin: 0 }}>Upcoming activities</h2>
        </div>
      </div>

      <div className="filters">
        <Link href="/#activities" className={!activity ? "active" : ""}>All</Link>
        {activities.map((a) => (
          <Link
            key={a}
            href={`/?activity=${encodeURIComponent(a)}#activities`}
            className={a === activity ? "active" : ""}
          >
            <span aria-hidden="true">{activityVisual(a).emoji}</span> {a}
          </Link>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="empty">
          <span className="emoji">🌤️</span>
          <h3>Nothing scheduled right now</h3>
          <p>Tell organizers what you&apos;d like to do and they&apos;ll use it to plan what&apos;s next.</p>
          <Link href="/suggest" className="btn">Suggest an activity</Link>
        </div>
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
