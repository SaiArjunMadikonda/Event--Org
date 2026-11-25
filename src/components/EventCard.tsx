import Link from "next/link";
import { eventStatus, formatEventDateTime } from "@/lib/format";

type Props = {
  event: {
    id: string;
    title: string;
    activity: string;
    startsAt: Date;
    timeZone: string;
    area: string;
    costEstimate: string;
    capacity: number;
    status: string;
    minGroupSize: number;
    maxGroupSize: number;
  };
  registeredCount: number;
  href?: string;
  joined?: boolean;
};

export function EventCard({ event, registeredCount, href, joined }: Props) {
  const status = eventStatus(event, registeredCount);
  const spotsLeft = Math.max(0, event.capacity - registeredCount);
  return (
    <Link href={href ?? `/events/${event.id}`} className="card event-card">
      <div className="row between">
        <span className="badge">{event.activity}</span>
        <span className={`badge ${status.tone}`}>{status.label}</span>
      </div>
      <h3>{event.title}</h3>
      <dl className="meta">
        <dt>When</dt>
        <dd>{formatEventDateTime(event.startsAt, event.timeZone)}</dd>
        <dt>Where</dt>
        <dd>{event.area}</dd>
        <dt>Cost</dt>
        <dd>{event.costEstimate}</dd>
        <dt>Spots</dt>
        <dd>
          {spotsLeft} of {event.capacity} left · groups of{" "}
          {event.minGroupSize === event.maxGroupSize ? event.minGroupSize : `${event.minGroupSize}–${event.maxGroupSize}`}
        </dd>
      </dl>
      {joined && <span className="badge ok" style={{ alignSelf: "flex-start" }}>You&apos;re going</span>}
    </Link>
  );
}
