import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { eventStatus, formatDateTime } from "@/lib/format";
import { Flash, type SearchParams } from "@/components/Flash";
import { joinEvent, leaveEvent } from "../../actions/participant";

export default async function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: { organizer: { select: { name: true } } },
  });
  if (!event) notFound();

  const registeredCount = await prisma.registration.count({ where: { eventId: id, status: "REGISTERED" } });
  const mine = await prisma.registration.findUnique({ where: { eventId_userId: { eventId: id, userId: user.id } } });
  const isRegistered = mine?.status === "REGISTERED";
  const status = eventStatus(event, registeredCount);
  const canJoin = status.label === "Registration open" && !isRegistered;
  const groupSize =
    event.minGroupSize === event.maxGroupSize ? `${event.minGroupSize}` : `${event.minGroupSize}–${event.maxGroupSize}`;
  const end = new Date(event.startsAt.getTime() + event.durationMinutes * 60_000);

  return (
    <div>
      <Flash searchParams={searchParams} />
      <p className="small">
        <Link href="/">← All activities</Link>
      </p>
      <div className="two-col">
        <div className="card stack">
          <div className="row">
            <span className="badge">{event.activity}</span>
            <span className={`badge ${status.tone}`}>{status.label}</span>
          </div>
          <h1>{event.title}</h1>
          <p>{event.description}</p>
          {event.whatToExpect && (
            <div>
              <h3>What to expect</h3>
              <p>{event.whatToExpect}</p>
            </div>
          )}
          <div className="callout">
            You&apos;ll be placed in a small group of <strong>{groupSize}</strong> people before the event, so you
            have some common ground to start a conversation. Your email and contact details are never shared.
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <dl className="meta">
              <dt>When</dt>
              <dd>
                {formatDateTime(event.startsAt)}
                <div className="muted small">about {Math.round(event.durationMinutes / 60 * 10) / 10} hours, until {formatDateTime(end).split(", ").pop()}</div>
              </dd>
              <dt>Area</dt>
              <dd>{event.area}</dd>
              {isRegistered && (
                <>
                  <dt>Meet at</dt>
                  <dd>{event.meetingPoint}</dd>
                </>
              )}
              <dt>Cost</dt>
              <dd>{event.costEstimate}</dd>
              <dt>Groups</dt>
              <dd>{groupSize} people</dd>
              <dt>Spots</dt>
              <dd>
                {Math.max(0, event.capacity - registeredCount)} of {event.capacity} left
              </dd>
              <dt>Organizer</dt>
              <dd>{event.organizer.name}</dd>
            </dl>
            {!isRegistered && <p className="muted small" style={{ marginTop: "0.75rem" }}>The exact meeting point is shown once you register.</p>}
          </div>

          {isRegistered ? (
            <div className="card stack">
              <div>
                <span className="badge ok">You&apos;re registered</span>
                {mine?.answer && <p className="small muted" style={{ marginTop: "0.5rem" }}>Your answer: {mine.answer}</p>}
              </div>
              <Link href={`/events/${event.id}/group`} className="btn">
                {event.status === "GROUPS_PUBLISHED" ? "See my group" : "Group status"}
              </Link>
              {event.status !== "CANCELLED" && event.startsAt > new Date() && (
                <form action={leaveEvent}>
                  <input type="hidden" name="eventId" value={event.id} />
                  <button className="btn danger small" type="submit">Leave this event</button>
                </form>
              )}
            </div>
          ) : canJoin ? (
            <form action={joinEvent} className="card">
              <input type="hidden" name="eventId" value={event.id} />
              {event.registrationQuestion && (
                <div className="field">
                  <label htmlFor="answer">{event.registrationQuestion}</label>
                  <input id="answer" name="answer" type="text" />
                  <span className="hint">Shared only with the organizer.</span>
                </div>
              )}
              <button className="btn" type="submit" style={{ width: "100%" }}>Join Event</button>
              <p className="muted small" style={{ margin: "0.5rem 0 0" }}>
                Joining holds your spot. Your group is assigned later.
              </p>
            </form>
          ) : (
            <div className="card muted">Registration isn&apos;t available ({status.label.toLowerCase()}).</div>
          )}
        </div>
      </div>
    </div>
  );
}
