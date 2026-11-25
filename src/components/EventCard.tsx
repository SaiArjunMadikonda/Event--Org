import Link from "next/link";
import { eventDateParts, eventStatus, formatEventTime } from "@/lib/format";
import { activityVisual } from "@/lib/activity";
import { Icon } from "./Icon";

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
  const filled = Math.min(100, Math.round((registeredCount / Math.max(1, event.capacity)) * 100));
  const { emoji, hue } = activityVisual(event.activity);
  const date = eventDateParts(event.startsAt, event.timeZone);
  const groupSize =
    event.minGroupSize === event.maxGroupSize ? `${event.minGroupSize}` : `${event.minGroupSize}–${event.maxGroupSize}`;

  return (
    <Link href={href ?? `/events/${event.id}`} className="card event-card">
      <div className="ec-top tint" style={{ ["--h" as string]: hue }}>
        <span className="emoji-tile" aria-hidden="true">{emoji}</span>
        <span className="date-pill" aria-label={`${date.weekday} ${date.month} ${date.day}`}>
          <span className="m">{date.month}</span>
          <span className="d">{date.day}</span>
          <span className="w">{date.weekday}</span>
        </span>
        <span className="ec-status">
          <span className={`badge ${status.tone}`}>{status.label}</span>
        </span>
        {joined && (
          <span className="going">
            <Icon name="check" size={13} /> You&apos;re going
          </span>
        )}
      </div>
      <div className="ec-body">
        <div>
          <div className="ec-activity" style={{ marginTop: "0.35rem" }}>{event.activity}</div>
          <h3>{event.title}</h3>
        </div>
        <div className="facts">
          <div><Icon name="clock" size={16} /><span>{formatEventTime(event.startsAt, event.timeZone)}</span></div>
          <div><Icon name="pin" size={16} /><span>{event.area}</span></div>
          <div><Icon name="tag" size={16} /><span>{event.costEstimate}</span></div>
          <div><Icon name="users" size={16} /><span>Groups of {groupSize}</span></div>
        </div>
        <div className="spots">
          <div className="spots-row">
            <span><strong>{spotsLeft}</strong> of {event.capacity} spots left</span>
            <span>{registeredCount} going</span>
          </div>
          <div className={spotsLeft === 0 ? "meter full" : "meter"}>
            <span style={{ width: `${Math.max(filled, 4)}%` }} />
          </div>
        </div>
      </div>
    </Link>
  );
}
