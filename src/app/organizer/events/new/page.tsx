import Link from "next/link";
import { requireOrganizer } from "@/lib/session";
import { INTEREST_CATEGORIES } from "@/lib/interests";
import { Flash, type SearchParams } from "@/components/Flash";
import { FormMemory } from "@/components/FormMemory";
import { TimeZoneSelect } from "@/components/TimeZoneSelect";
import { Icon } from "@/components/Icon";

export const metadata = { title: "Create an event" };
import { createEvent } from "../../../actions/organizer";

export default async function NewEventPage({ searchParams }: { searchParams: SearchParams }) {
  await requireOrganizer();
  return (
    <div className="stack" style={{ maxWidth: 760 }}>
      <Flash searchParams={searchParams} />
      <Link href="/organizer" className="back" style={{ marginBottom: 0 }}><Icon name="arrowLeft" size={16} /> Dashboard</Link>
      <div>
        <div className="eyebrow"><Icon name="plus" size={15} /> New activity</div>
        <h1 style={{ margin: 0 }}>Create an event</h1>
        <p className="muted" style={{ margin: "0.35rem 0 0" }}>Set the basics and the group size. You&apos;ll review groups before anyone sees them.</p>
      </div>
      <FormMemory formId="create-event" />
      <form id="create-event" action={createEvent} className="card">
        <div className="fields-2">
          <div className="field">
            <label htmlFor="title">Title</label>
            <input id="title" name="title" type="text" placeholder="Movie and Dinner Night" required />
          </div>
          <div className="field">
            <label htmlFor="activity">Activity type <span className="hint">· shown as a filter</span></label>
            <input id="activity" name="activity" type="text" placeholder="Movies & Dinner" required />
          </div>
        </div>
        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea id="description" name="description" required />
        </div>
        <div className="field">
          <label htmlFor="whatToExpect">What to expect when you arrive <span className="hint">· optional</span></label>
          <textarea id="whatToExpect" name="whatToExpect" />
        </div>
        <div className="fields-2">
          <div className="field">
            <label htmlFor="startsAt">Date and time <span className="hint">· local time where it happens</span></label>
            <input id="startsAt" name="startsAt" type="datetime-local" required />
          </div>
          <div className="field">
            <label htmlFor="timeZone">Time zone</label>
            <TimeZoneSelect />
          </div>
          <div className="field">
            <label htmlFor="durationMinutes">Duration (minutes)</label>
            <input id="durationMinutes" name="durationMinutes" type="number" min={15} step={15} defaultValue={120} />
          </div>
          <div className="field">
            <label htmlFor="area">General area <span className="hint">· visible to everyone</span></label>
            <input id="area" name="area" type="text" placeholder="Las Colinas, Irving" required />
          </div>
          <div className="field">
            <label htmlFor="meetingPoint">Exact meeting point <span className="hint">· registered attendees only</span></label>
            <input id="meetingPoint" name="meetingPoint" type="text" required />
          </div>
          <div className="field">
            <label htmlFor="costEstimate">Expected cost</label>
            <input id="costEstimate" name="costEstimate" type="text" placeholder="$15–$35, pay at venue" />
          </div>
          <div className="field">
            <label htmlFor="capacity">Capacity (total spots)</label>
            <input id="capacity" name="capacity" type="number" min={2} max={500} defaultValue={15} required />
          </div>
          <div className="field">
            <label>Group size (min – max)</label>
            <div className="row" style={{ flexWrap: "nowrap" }}>
              <input name="minGroupSize" type="number" min={2} max={50} defaultValue={5} aria-label="Minimum group size" required />
              <span className="muted">to</span>
              <input name="maxGroupSize" type="number" min={2} max={50} defaultValue={5} aria-label="Maximum group size" required />
            </div>
          </div>
          <div className="field">
            <label htmlFor="interestCategory">Match on interests in</label>
            <select id="interestCategory" name="interestCategory" defaultValue="">
              <option value="">All interests</option>
              {INTEREST_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="registrationQuestion">Question for attendees <span className="hint">· optional, e.g. dietary preferences</span></label>
          <input id="registrationQuestion" name="registrationQuestion" type="text" />
        </div>
        <button className="btn large" type="submit"><Icon name="check" /> Create event</button>
      </form>
    </div>
  );
}
