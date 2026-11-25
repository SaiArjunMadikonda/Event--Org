import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/session";
import { eventStatus, formatDate, formatDateTime, formatEventDateTime, parseJson } from "@/lib/format";
import {
  METHOD_DESCRIPTIONS,
  UNASSIGNED_REASON_TEXT,
  type MatchingMethod,
  type UnassignedAttendee,
} from "@/lib/matching/engine";
import { Flash, type SearchParams } from "@/components/Flash";
import { Icon } from "@/components/Icon";
import { Avatar } from "@/components/Avatar";
import { activityVisual } from "@/lib/activity";
import {
  discardPreview,
  generatePreview,
  publishPreview,
  setEventStatus,
  updateGroupRule,
} from "../../../actions/organizer";

export default async function OrganizerEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const user = await requireOrganizer();
  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) notFound();
  if (event.organizerId !== user.id) {
    return <div className="card">Only this event&apos;s organizer can manage it.</div>;
  }

  const [registrations, runs] = await Promise.all([
    prisma.registration.findMany({
      where: { eventId: id },
      orderBy: { createdAt: "asc" },
      include: { user: { include: { interests: { include: { interest: true } } } } },
    }),
    prisma.matchingRun.findMany({
      where: { eventId: id, status: { in: ["PREVIEW", "PUBLISHED"] } },
      orderBy: { createdAt: "desc" },
      include: {
        groups: {
          orderBy: { number: "asc" },
          include: { members: { include: { user: { include: { interests: { include: { interest: true } } } } } } },
        },
      },
    }),
  ]);

  const active = registrations.filter((r) => r.status === "REGISTERED");
  const cancelled = registrations.filter((r) => r.status === "CANCELLED");
  const activeIds = new Set(active.map((r) => r.userId));
  const nameOf = new Map(registrations.map((r) => [r.userId, r.user.name]));
  const status = eventStatus(event, active.length);
  const preview = runs.find((r) => r.status === "PREVIEW");
  const published = runs.find((r) => r.status === "PUBLISHED");
  const relevant = (interests: { interest: { name: string; category: string } }[]) =>
    interests
      .filter((ui) => !event.interestCategory || ui.interest.category === event.interestCategory)
      .map((ui) => ui.interest.name);

  // Who joined after the published groups were formed (and so has no group)?
  const publishedIds = new Set(
    published
      ? [
          ...published.groups.flatMap((g) => g.members.map((m) => m.userId)),
          ...parseJson<UnassignedAttendee[]>(published.unassignedJson, []).map((u) => u.id),
        ]
      : [],
  );
  const joinedAfterPublish = published ? active.filter((r) => !publishedIds.has(r.userId)) : [];

  const renderRun = (run: NonNullable<typeof preview>) => {
    const unassigned = parseJson<UnassignedAttendee[]>(run.unassignedJson, []);
    return (
      <div className="stack">
        <div className="callout small">
          <strong>Method:</strong> {METHOD_DESCRIPTIONS[run.method as MatchingMethod]}
          <div className="muted">
            Rule: groups of {run.minGroupSize}–{run.maxGroupSize} · {run.groups.length} group(s) ·{" "}
            {run.groups.reduce((s, g) => s + g.members.length, 0)} placed · {unassigned.length} unassigned · seed {run.seed}
          </div>
        </div>
        <div className="grid">
          {run.groups.map((g) => {
            const shared = parseJson<string[]>(g.sharedInterestsJson, []);
            return (
              <div key={g.id} className="card group-card">
                <h3>
                  <span className="row" style={{ gap: 0 }}><span className="gn">{g.number}</span>Group {g.number}</span>
                  <span className="badge plain">{g.members.length} people</span>
                </h3>
                {shared.length > 0 ? (
                  <p className="small" style={{ margin: "0 0 0.4rem" }}>
                    {shared.map((s) => <span key={s} className="chip on">{s}</span>)}
                  </p>
                ) : (
                  <p className="small muted">No interests shared by 2+ members</p>
                )}
                {g.members.map((m) => (
                  <div key={m.id} className="member small" style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
                    <Avatar name={m.user.name} size={28} />
                    <div>
                      <strong>{m.user.name}</strong>
                      {!activeIds.has(m.userId) && <span className="badge warn" style={{ marginLeft: 6 }}>Left event</span>}
                      <div className="muted">{relevant(m.user.interests).join(", ") || "No relevant interests"}</div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        {unassigned.length > 0 && (
          <div className="card" style={{ borderColor: "var(--warn)" }}>
            <h3>Unassigned ({unassigned.length})</h3>
            {unassigned.map((u) => (
              <div key={u.id} className="member small">
                <strong>{nameOf.get(u.id) ?? u.id}</strong>
                <div className="muted">{UNASSIGNED_REASON_TEXT[u.reason]}</div>
              </div>
            ))}
            <p className="small" style={{ marginTop: "0.6rem" }}>
              Options: invite more people, change the group-size rule below and create a new preview, or contact these
              attendees and handle it manually. The matcher never breaks your size rule or a block to place someone.
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="stack">
      <Link href="/organizer" className="back" style={{ marginBottom: 0 }}><Icon name="arrowLeft" size={16} /> Dashboard</Link>
      <Flash searchParams={searchParams} />

      <div className="event-hero tint row between" style={{ ["--h" as string]: activityVisual(event.activity).hue, marginBottom: 0, alignItems: "flex-end" }}>
        <div>
          <span className="emoji-tile" aria-hidden="true">{activityVisual(event.activity).emoji}</span>
          <div className="row" style={{ gap: "0.6rem" }}>
            <h1 style={{ margin: 0 }}>{event.title}</h1>
            <span className={`badge ${status.tone}`}>{status.label}</span>
          </div>
          <p className="muted" style={{ margin: "0.35rem 0 0", color: "var(--text-2)" }}>
            {formatEventDateTime(event.startsAt, event.timeZone)} · {event.area} · {event.costEstimate}
          </p>
        </div>
        <div className="row">
          <Link href={`/events/${event.id}`} className="btn secondary small">View public page</Link>
          {event.status !== "CANCELLED" && (
            <>
              {event.status === "OPEN" && (
                <form action={setEventStatus}>
                  <input type="hidden" name="eventId" value={event.id} />
                  <input type="hidden" name="status" value="CLOSED" />
                  <button className="btn secondary small" type="submit">Close registration</button>
                </form>
              )}
              {event.status === "CLOSED" && (
                <form action={setEventStatus}>
                  <input type="hidden" name="eventId" value={event.id} />
                  <input type="hidden" name="status" value="OPEN" />
                  <button className="btn secondary small" type="submit">Reopen registration</button>
                </form>
              )}
              <form action={setEventStatus}>
                <input type="hidden" name="eventId" value={event.id} />
                <input type="hidden" name="status" value="CANCELLED" />
                <button className="btn danger small" type="submit">Cancel event</button>
              </form>
            </>
          )}
        </div>
      </div>

      <div className="stats">
        <div className="card stat-card ok"><span className="si"><Icon name="ticket" size={20} /></span><div><div className="stat">{active.length} / {event.capacity}</div><div className="muted small">Registered</div></div></div>
        <div className="card stat-card"><span className="si"><Icon name="users" size={20} /></span><div><div className="stat">{event.minGroupSize === event.maxGroupSize ? event.minGroupSize : `${event.minGroupSize}–${event.maxGroupSize}`}</div><div className="muted small">Group size rule</div></div></div>
        <div className="card stat-card warn"><span className="si"><Icon name="logout" size={20} /></span><div><div className="stat">{cancelled.length}</div><div className="muted small">Cancelled</div></div></div>
        <div className="card stat-card info"><span className="si"><Icon name="heart" size={20} /></span><div><div className="stat" style={{ fontSize: event.interestCategory ? "1.25rem" : undefined }}>{event.interestCategory ?? "All"}</div><div className="muted small">Interests used for matching</div></div></div>
      </div>

      <div className="card">
        <h2 className="card-title"><Icon name="ticket" /> Registrations</h2>
        {active.length === 0 ? (
          <p className="muted">No one has registered yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Relevant interests</th>
                  {event.registrationQuestion && <th>{event.registrationQuestion}</th>}
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {active.map((r, i) => (
                  <tr key={r.id}>
                    <td className="muted">{i + 1}</td>
                    <td><span className="cell-title" style={{ fontWeight: 600 }}><Avatar name={r.user.name} size={28} /> {r.user.name}</span></td>
                    <td className="small">{relevant(r.user.interests).join(", ") || <span className="muted">—</span>}</td>
                    {event.registrationQuestion && <td className="small">{r.answer || <span className="muted">—</span>}</td>}
                    <td className="small muted">{formatDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card stack" id="matching">
        <h2 className="card-title"><Icon name="users" /> Groups</h2>

        {event.status !== "CANCELLED" && event.status !== "GROUPS_PUBLISHED" && (
          <div className="two-col">
            <form action={generatePreview} className="callout">
              <input type="hidden" name="eventId" value={event.id} />
              <label>Grouping method</label>
              <label className="check">
                <input type="radio" name="method" value="INTEREST" defaultChecked /> Interest-based groups
              </label>
              <label className="check" style={{ marginBottom: "0.6rem" }}>
                <input type="radio" name="method" value="RANDOM" /> Mostly random groups
              </label>
              <button className="btn" type="submit" disabled={active.length === 0}>
                {preview ? "Create a new group preview" : "Create Group Preview"}
              </button>
              <p className="hint" style={{ margin: "0.5rem 0 0" }}>
                Nothing is shown to attendees until you publish.
              </p>
            </form>
            <form action={updateGroupRule} className="callout">
              <input type="hidden" name="eventId" value={event.id} />
              <label>Group size rule</label>
              <div className="row" style={{ flexWrap: "nowrap", marginBottom: "0.6rem" }}>
                <input name="minGroupSize" type="number" min={2} max={50} defaultValue={event.minGroupSize} aria-label="Minimum group size" />
                <span className="muted">to</span>
                <input name="maxGroupSize" type="number" min={2} max={50} defaultValue={event.maxGroupSize} aria-label="Maximum group size" />
              </div>
              <button className="btn secondary small" type="submit">Update rule</button>
            </form>
          </div>
        )}

        {preview && (
          <div className="stack">
            <div className="row between">
              <h3 style={{ margin: 0 }}>
                Preview <span className="badge warn">Not visible to attendees</span>
              </h3>
              <div className="row">
                <form action={discardPreview}>
                  <input type="hidden" name="runId" value={preview.id} />
                  <button className="btn secondary small" type="submit">Discard</button>
                </form>
                <form action={publishPreview}>
                  <input type="hidden" name="runId" value={preview.id} />
                  <button className="btn" type="submit" disabled={preview.groups.length === 0}>Publish groups</button>
                </form>
              </div>
            </div>
            {renderRun(preview)}
          </div>
        )}

        {published && (
          <div className="stack">
            <h3 style={{ margin: 0 }}>
              Published groups <span className="badge accent">Visible to attendees</span>
              {published.publishedAt && <span className="muted small"> · {formatDateTime(published.publishedAt)}</span>}
            </h3>
            {joinedAfterPublish.length > 0 && (
              <div className="flash error">
                {joinedAfterPublish.length} attendee(s) have no group because they are not in the published run:{" "}
                {joinedAfterPublish.map((r) => r.user.name).join(", ")}.
              </div>
            )}
            {renderRun(published)}
          </div>
        )}

        {!preview && !published && (
          <p className="muted small">No groups yet. Create a preview when registrations are in.</p>
        )}
      </div>
    </div>
  );
}
