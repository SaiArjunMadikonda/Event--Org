import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { firstName, formatEventDateTime } from "@/lib/format";
import { LocalTimeHint } from "@/components/LocalTimeHint";
import { getMyAssignment } from "@/lib/groups";
import { METHOD_DESCRIPTIONS, type MatchingMethod } from "@/lib/matching/engine";
import { Flash, type SearchParams } from "@/components/Flash";
import { blockUser, reportUser } from "../../../actions/participant";

export default async function MyGroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) notFound();

  const reg = await prisma.registration.findUnique({ where: { eventId_userId: { eventId: id, userId: user.id } } });
  const here = `/events/${id}/group`;

  if (!reg || reg.status !== "REGISTERED") {
    return (
      <div className="card">
        <h1>{event.title}</h1>
        <p className="muted">You&apos;re not registered for this event, so there&apos;s no group to show.</p>
        <Link href={`/events/${id}`} className="btn secondary">View event</Link>
      </div>
    );
  }

  const assignment = await getMyAssignment(id, user.id);
  const myInterests = new Set(
    (await prisma.userInterest.findMany({ where: { userId: user.id }, include: { interest: true } })).map(
      (ui) => ui.interest.name,
    ),
  );

  return (
    <div className="stack" style={{ maxWidth: 760 }}>
      <Flash searchParams={searchParams} />
      <p className="small">
        <Link href={`/events/${id}`}>← {event.title}</Link>
      </p>

      {event.status === "CANCELLED" && (
        <div className="flash error">This event has been cancelled by the organizer.</div>
      )}

      {assignment.state === "NOT_PUBLISHED" && (
        <div className="card">
          <h1>Your group isn&apos;t ready yet</h1>
          <p className="muted">
            You have a spot at <strong>{event.title}</strong> on {formatEventDateTime(event.startsAt, event.timeZone)}. The organizer will
            form groups closer to the date, and your group will appear here once it&apos;s published.
          </p>
        </div>
      )}

      {(assignment.state === "UNASSIGNED" || assignment.state === "NOT_IN_RUN") && (
        <div className="card">
          <h1>You&apos;re registered, but not in a group yet</h1>
          <p className="muted">
            Groups were published, but we couldn&apos;t place you in one under this event&apos;s group-size rules
            {assignment.state === "NOT_IN_RUN" ? " (you joined after groups were formed)" : ""}. The organizer can see
            this and will follow up with you. Your spot at the event is still held.
          </p>
        </div>
      )}

      {assignment.state === "ASSIGNED" && (
        <>
          <div className="card">
            <span className="badge accent">Group {assignment.group.number}</span>
            <h1 style={{ marginTop: "0.5rem" }}>{event.title}</h1>
            <dl className="meta">
              <dt>When</dt>
              <dd>
                {formatEventDateTime(event.startsAt, event.timeZone)}
                <LocalTimeHint iso={event.startsAt.toISOString()} timeZone={event.timeZone} />
              </dd>
              <dt>Meet at</dt>
              <dd>{event.meetingPoint}</dd>
              <dt>Your group</dt>
              <dd>Group / table {assignment.group.number}</dd>
            </dl>
            {event.whatToExpect && <p className="small" style={{ marginTop: "0.75rem" }}>{event.whatToExpect}</p>}
            {assignment.sharedInterests.length > 0 && (
              <p style={{ marginTop: "0.75rem" }}>
                <span className="muted small">Things your group has in common: </span>
                {assignment.sharedInterests.map((i) => (
                  <span key={i} className="chip on">{i}</span>
                ))}
              </p>
            )}
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0 }}>Who&apos;s in your group</h2>
            <p className="muted small">
              You see first names, shared interests, and a short bio only if that person chose to share it. Nobody&apos;s
              email or contact details are shown.
            </p>
            {assignment.group.members.map((m) => {
              const isMe = m.userId === user.id;
              const left = m.user.registrations[0]?.status !== "REGISTERED";
              const shared = m.user.interests.map((ui) => ui.interest.name).filter((n) => myInterests.has(n));
              return (
                <div className="member" key={m.id}>
                  <div className="row between">
                    <strong>
                      {firstName(m.user.name)}
                      {isMe && <span className="muted"> (you)</span>}
                      {left && <span className="badge warn" style={{ marginLeft: 8 }}>Can no longer attend</span>}
                    </strong>
                    {!isMe && (
                      <details>
                        <summary>Block or report</summary>
                        <div className="stack" style={{ padding: "0.5rem 0" }}>
                          <form action={blockUser}>
                            <input type="hidden" name="userId" value={m.userId} />
                            <input type="hidden" name="returnTo" value={here} />
                            <button className="btn danger small" type="submit">
                              Block {firstName(m.user.name)}
                            </button>
                            <div className="hint">You won&apos;t be grouped together in future events.</div>
                          </form>
                          <form action={reportUser}>
                            <input type="hidden" name="reportedUserId" value={m.userId} />
                            <input type="hidden" name="eventId" value={id} />
                            <input type="hidden" name="returnTo" value={here} />
                            <textarea name="reason" placeholder="What happened? Only the organizer sees this." required />
                            <button className="btn secondary small" type="submit">Send report</button>
                          </form>
                        </div>
                      </details>
                    )}
                  </div>
                  {!isMe && shared.length > 0 && (
                    <div className="small">
                      <span className="muted">You both like: </span>
                      {shared.join(", ")}
                    </div>
                  )}
                  {!isMe && m.user.shareBioWithGroup && m.user.bio && <div className="small muted">“{m.user.bio}”</div>}
                </div>
              );
            })}
          </div>

          <div className="callout small">
            <strong>How this group was formed.</strong>{" "}
            {METHOD_DESCRIPTIONS[assignment.run.method as MatchingMethod]} Groups give you some common ground; they
            aren&apos;t a promise that everyone will become friends.
          </div>
        </>
      )}

      <details className="card">
        <summary>Report a problem with this event</summary>
        <form action={reportUser} style={{ marginTop: "0.75rem" }}>
          <input type="hidden" name="eventId" value={id} />
          <input type="hidden" name="returnTo" value={here} />
          <textarea name="reason" placeholder="Describe the problem. Only the organizer sees this." required />
          <button className="btn secondary small" type="submit" style={{ marginTop: "0.5rem" }}>Send to organizer</button>
        </form>
      </details>
    </div>
  );
}
