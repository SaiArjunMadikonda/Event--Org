import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { firstName, formatEventDateTime } from "@/lib/format";
import { activityVisual } from "@/lib/activity";
import { LocalTimeHint } from "@/components/LocalTimeHint";
import { getMyAssignment } from "@/lib/groups";
import { METHOD_DESCRIPTIONS, type MatchingMethod } from "@/lib/matching/engine";
import { Flash, type SearchParams } from "@/components/Flash";
import { Icon } from "@/components/Icon";
import { Avatar } from "@/components/Avatar";
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
  const { emoji } = activityVisual(event.activity);

  if (!reg || reg.status !== "REGISTERED") {
    return (
      <div className="empty" style={{ maxWidth: 560, margin: "2rem auto" }}>
        <span className="emoji">{emoji}</span>
        <h3>{event.title}</h3>
        <p>You&apos;re not registered for this activity, so there&apos;s no group to show.</p>
        <Link href={`/events/${id}`} className="btn secondary">View activity</Link>
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
    <div className="stack" style={{ maxWidth: 820, margin: "0 auto" }}>
      <Link href={`/events/${id}`} className="back" style={{ marginBottom: 0 }}>
        <Icon name="arrowLeft" size={16} /> {event.title}
      </Link>
      <Flash searchParams={searchParams} />

      {event.status === "CANCELLED" && (
        <div className="flash error"><Icon name="alert" /> This event has been cancelled by the organizer.</div>
      )}

      {assignment.state === "NOT_PUBLISHED" && (
        <div className="empty">
          <span className="emoji">⏳</span>
          <h3>Your group isn&apos;t ready yet</h3>
          <p>
            You have a spot at <strong>{event.title}</strong> on {formatEventDateTime(event.startsAt, event.timeZone)}.
            The organizer will form groups closer to the date, and yours will appear right here.
          </p>
        </div>
      )}

      {(assignment.state === "UNASSIGNED" || assignment.state === "NOT_IN_RUN") && (
        <div className="empty">
          <span className="emoji">🧭</span>
          <h3>You&apos;re registered, but not in a group yet</h3>
          <p>
            Groups were published, but we couldn&apos;t place you under this event&apos;s group-size rules
            {assignment.state === "NOT_IN_RUN" ? " (you joined after groups were formed)" : ""}. The organizer can see
            this and will follow up. Your spot at the event is still held.
          </p>
        </div>
      )}

      {assignment.state === "ASSIGNED" && (
        <>
          <section className="group-hero">
            <div className="group-number">{assignment.group.number}</div>
            <div className="eyebrow" style={{ color: "#fff" }}>{emoji} You&apos;re in Group {assignment.group.number}</div>
            <h1>{event.title}</h1>
            <p>Here&apos;s who you&apos;re meeting and where. Say hi when you arrive!</p>
            <div className="facts">
              <div>
                <Icon name="calendar" size={17} />
                <span style={{ whiteSpace: "normal" }}>
                  {formatEventDateTime(event.startsAt, event.timeZone)}
                  <LocalTimeHint iso={event.startsAt.toISOString()} timeZone={event.timeZone} />
                </span>
              </div>
              <div><Icon name="pin" size={17} /><span style={{ whiteSpace: "normal" }}>{event.meetingPoint}</span></div>
              <div><Icon name="users" size={17} /><span>Group / table {assignment.group.number} · {assignment.group.members.length} people</span></div>
            </div>
            {assignment.sharedInterests.length > 0 && (
              <div style={{ marginTop: "1rem" }}>
                <div className="small" style={{ opacity: 0.85, marginBottom: "0.4rem" }}>Your group has in common</div>
                {assignment.sharedInterests.map((i) => (
                  <span key={i} className="chip on">{i}</span>
                ))}
              </div>
            )}
          </section>

          {event.whatToExpect && (
            <div className="callout accent">
              <strong>When you arrive:</strong> {event.whatToExpect}
            </div>
          )}

          <div className="card">
            <h2 className="card-title"><Icon name="users" /> Who&apos;s in your group</h2>
            <p className="muted small">
              You see first names, interests you share, and a short bio only if that person chose to share it. Nobody&apos;s
              email or contact details are shown.
            </p>
            {assignment.group.members.map((m) => {
              const isMe = m.userId === user.id;
              const left = m.user.registrations[0]?.status !== "REGISTERED";
              const shared = m.user.interests.map((ui) => ui.interest.name).filter((n) => myInterests.has(n));
              return (
                <div className="member-card" key={m.id}>
                  {/* First name only: group members never see each other's last names. */}
                  <Avatar name={firstName(m.user.name)} size={44} />
                  <div className="who">
                    <div className="row" style={{ gap: "0.5rem" }}>
                      <span className="name">{firstName(m.user.name)}</span>
                      {isMe && <span className="badge plain">You</span>}
                      {left && <span className="badge warn">Can no longer attend</span>}
                    </div>
                    {!isMe && shared.length > 0 && (
                      <div style={{ marginTop: "0.35rem" }}>
                        {shared.map((s) => <span key={s} className="chip on">{s}</span>)}
                      </div>
                    )}
                    {!isMe && m.user.shareBioWithGroup && m.user.bio && (
                      <div className="small muted" style={{ marginTop: "0.2rem" }}>&ldquo;{m.user.bio}&rdquo;</div>
                    )}
                    {!isMe && (
                      <details style={{ marginTop: "0.4rem" }}>
                        <summary>Block or report</summary>
                        <div className="stack" style={{ padding: "0.6rem 0" }}>
                          <form action={blockUser}>
                            <input type="hidden" name="userId" value={m.userId} />
                            <input type="hidden" name="returnTo" value={here} />
                            <button className="btn danger small" type="submit">Block {firstName(m.user.name)}</button>
                            <div className="hint" style={{ marginTop: 4 }}>You won&apos;t be grouped together in future events.</div>
                          </form>
                          <form action={reportUser} className="stack">
                            <input type="hidden" name="reportedUserId" value={m.userId} />
                            <input type="hidden" name="eventId" value={id} />
                            <input type="hidden" name="returnTo" value={here} />
                            <textarea name="reason" placeholder="What happened? Only the organizer sees this." required />
                            <div><button className="btn secondary small" type="submit">Send report</button></div>
                          </form>
                        </div>
                      </details>
                    )}
                  </div>
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

      <details className="card flat">
        <summary><Icon name="flag" size={15} /> Report a problem with this event</summary>
        <form action={reportUser} className="stack" style={{ marginTop: "0.9rem" }}>
          <input type="hidden" name="eventId" value={id} />
          <input type="hidden" name="returnTo" value={here} />
          <textarea name="reason" placeholder="Describe the problem. Only the organizer sees this." required />
          <div><button className="btn secondary small" type="submit">Send to organizer</button></div>
        </form>
      </details>
    </div>
  );
}
