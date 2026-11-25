import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { eventStatus, formatEventDateTime, formatEventTime } from "@/lib/format";
import { activityVisual } from "@/lib/activity";
import { Flash, type SearchParams } from "@/components/Flash";
import { LocalTimeHint } from "@/components/LocalTimeHint";
import { Icon } from "@/components/Icon";
import { Avatar } from "@/components/Avatar";
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
  const hours = Math.round((event.durationMinutes / 60) * 10) / 10;
  const spotsLeft = Math.max(0, event.capacity - registeredCount);
  const filled = Math.min(100, Math.round((registeredCount / Math.max(1, event.capacity)) * 100));
  const { emoji, hue } = activityVisual(event.activity);

  return (
    <div>
      <Link href="/" className="back"><Icon name="arrowLeft" size={16} /> All activities</Link>
      <Flash searchParams={searchParams} />

      <section className="event-hero tint" style={{ ["--h" as string]: hue }}>
        <span className="emoji-tile" aria-hidden="true">{emoji}</span>
        <div className="ec-activity" style={{ fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--text-2)" }}>
          {event.activity}
        </div>
        <h1>{event.title}</h1>
        <div className="row">
          <span className={`badge ${status.tone}`}>{status.label}</span>
          {isRegistered && <span className="badge ok">You&apos;re going</span>}
          <span className="badge plain"><Icon name="users" size={13} /> Groups of {groupSize}</span>
        </div>
      </section>

      <div className="two-col">
        <div className="stack">
          <div className="card prose">
            <h2 className="card-title">About this activity</h2>
            <p>{event.description}</p>
            {event.whatToExpect && (
              <>
                <h3 style={{ marginTop: "1.2rem" }}>What to expect</h3>
                <p>{event.whatToExpect}</p>
              </>
            )}
          </div>

          <div className="card">
            <h2 className="card-title"><Icon name="sparkles" /> How your group works</h2>
            <div className="how">
              <div><span className="n">1</span><strong>Join</strong>Your spot is held right away.</div>
              <div><span className="n">2</span><strong>Get matched</strong>A small group of {groupSize}, with some interests in common.</div>
              <div><span className="n">3</span><strong>Meet up</strong>See your group and the meeting point before the day.</div>
            </div>
            <p className="fine" style={{ marginTop: "1rem" }}>
              <Icon name="shield" size={15} />
              <span>Your email and contact details are never shared with your group.</span>
            </p>
          </div>
        </div>

        <aside className="stack sticky">
          <div className="card">
            <dl className="detail-list">
              <div>
                <span className="di"><Icon name="calendar" /></span>
                <div>
                  <dt>When</dt>
                  <dd>
                    {formatEventDateTime(event.startsAt, event.timeZone)}
                    <div className="small muted">About {hours} hours, until {formatEventTime(end, event.timeZone)}</div>
                    <LocalTimeHint iso={event.startsAt.toISOString()} timeZone={event.timeZone} />
                  </dd>
                </div>
              </div>
              <div>
                <span className="di"><Icon name="pin" /></span>
                <div>
                  <dt>{isRegistered ? "Meet at" : "Area"}</dt>
                  <dd>
                    {isRegistered ? event.meetingPoint : event.area}
                    {isRegistered ? (
                      <div className="small muted">{event.area}</div>
                    ) : (
                      <div className="small muted">Exact meeting point shown once you join</div>
                    )}
                  </dd>
                </div>
              </div>
              <div>
                <span className="di"><Icon name="tag" /></span>
                <div>
                  <dt>Cost</dt>
                  <dd>{event.costEstimate}</dd>
                </div>
              </div>
              <div>
                <span className="di"><Icon name="user" /></span>
                <div>
                  <dt>Organizer</dt>
                  <dd className="row" style={{ gap: "0.5rem" }}>
                    <Avatar name={event.organizer.name} size={24} /> {event.organizer.name}
                  </dd>
                </div>
              </div>
            </dl>
          </div>

          <div className="card join-card">
            <div className="spots" style={{ marginBottom: "1.1rem" }}>
              <div className="spots-row">
                <span><strong>{spotsLeft}</strong> of {event.capacity} spots left</span>
                <span>{registeredCount} going</span>
              </div>
              <div className={spotsLeft === 0 ? "meter full" : "meter"}>
                <span style={{ width: `${Math.max(filled, 4)}%` }} />
              </div>
            </div>

            {isRegistered ? (
              <div className="stack" style={{ ["--gap" as string]: 0 }}>
                <div className="callout accent small">
                  <strong>You&apos;re in!</strong>{" "}
                  {event.status === "GROUPS_PUBLISHED"
                    ? "Your group is ready."
                    : "We'll place you in a group closer to the day."}
                  {mine?.answer && <div className="muted" style={{ marginTop: 4 }}>Your answer: {mine.answer}</div>}
                </div>
                <Link href={`/events/${event.id}/group`} className="btn block large">
                  <Icon name="users" /> {event.status === "GROUPS_PUBLISHED" ? "See my group" : "Group status"}
                </Link>
                {event.status !== "CANCELLED" && event.startsAt > new Date() && (
                  <form action={leaveEvent} className="center">
                    <input type="hidden" name="eventId" value={event.id} />
                    <button className="btn link small" type="submit">Can&apos;t make it? Leave this event</button>
                  </form>
                )}
              </div>
            ) : canJoin ? (
              <form action={joinEvent}>
                <input type="hidden" name="eventId" value={event.id} />
                {event.registrationQuestion && (
                  <div className="field">
                    <label htmlFor="answer">{event.registrationQuestion}</label>
                    <input id="answer" name="answer" type="text" />
                    <span className="hint">Shared only with the organizer.</span>
                  </div>
                )}
                <button className="btn block large" type="submit">Join this activity <Icon name="arrowRight" size={17} /></button>
                <p className="fine center" style={{ justifyContent: "center" }}>Joining holds your spot. Your group is assigned later.</p>
              </form>
            ) : (
              <div className="callout small">Registration isn&apos;t available right now ({status.label.toLowerCase()}).</div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
