import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/session";
import { formatDate } from "@/lib/format";
import { Flash, type SearchParams } from "@/components/Flash";
import { reviewApplication } from "../../actions/onboarding";

export default async function ApplicationsPage({ searchParams }: { searchParams: SearchParams }) {
  const me = await requireOrganizer();
  const [pending, decided] = await Promise.all([
    prisma.organizerApplication.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { name: true, city: true, createdAt: true } } },
    }),
    prisma.organizerApplication.findMany({
      where: { status: { not: "PENDING" } },
      orderBy: { reviewedAt: "desc" },
      take: 20,
      include: { user: { select: { name: true } }, reviewedBy: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="stack">
      <Flash searchParams={searchParams} />
      <p className="small"><Link href="/organizer">← Dashboard</Link></p>
      <div>
        <h1 style={{ margin: 0 }}>Organizer applications</h1>
        <p className="muted" style={{ margin: 0 }}>
          Approving someone lets them create events and publish groups. Any note you add is shown to the applicant.
        </p>
      </div>

      {pending.length === 0 && <div className="card muted">No applications waiting for review.</div>}

      {pending.map((a) => (
        <div key={a.id} className="card">
          <div className="row between">
            <h2 style={{ margin: 0 }}>{a.user.name}</h2>
            <span className="small muted">Applied {formatDate(a.createdAt)}</span>
          </div>
          <p className="small muted">
            Member since {formatDate(a.user.createdAt)}
            {a.user.city ? ` · ${a.user.city}` : ""}
          </p>
          <dl className="meta">
            <dt>Plans</dt>
            <dd>{a.plans}</dd>
            <dt>Area</dt>
            <dd>{a.area}</dd>
            <dt>Experience</dt>
            <dd>{a.experience || <span className="muted">Not given</span>}</dd>
          </dl>
          {a.userId === me.id ? (
            <p className="small muted" style={{ margin: "0.75rem 0 0" }}>This is your own application.</p>
          ) : (
            <form action={reviewApplication} className="row" style={{ marginTop: "0.9rem" }}>
              <input type="hidden" name="applicationId" value={a.id} />
              <input
                name="reviewerNote"
                type="text"
                maxLength={500}
                placeholder="Note to applicant (optional)"
                style={{ flex: 1, minWidth: 200 }}
              />
              <button className="btn" type="submit" name="decision" value="APPROVE">Approve</button>
              <button className="btn danger" type="submit" name="decision" value="DECLINE">Decline</button>
            </form>
          )}
        </div>
      ))}

      {decided.length > 0 && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Recent decisions</h2>
          {decided.map((a) => (
            <div key={a.id} className="member row between">
              <div>
                <strong>{a.user.name}</strong>
                <div className="small muted">
                  {a.reviewedAt ? formatDate(a.reviewedAt) : ""}
                  {a.reviewedBy ? ` · by ${a.reviewedBy.name}` : ""}
                  {a.reviewerNote ? ` · “${a.reviewerNote}”` : ""}
                </div>
              </div>
              <span className={`badge ${a.status === "APPROVED" ? "ok" : ""}`}>
                {a.status === "APPROVED" ? "Approved" : "Declined"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
