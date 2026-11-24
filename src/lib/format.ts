// Demo events are in the Dallas–Fort Worth area.
const TIME_ZONE = "America/Chicago";

export function formatDateTime(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  }).format(d);
}

export function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: TIME_ZONE }).format(d);
}

export function firstName(name: string): string {
  return name.split(" ")[0];
}

export type EventLike = { status: string; startsAt: Date; capacity: number };

/** What participants should see as an event's status. */
export function eventStatus(event: EventLike, registeredCount: number): { label: string; tone: string } {
  if (event.status === "CANCELLED") return { label: "Cancelled", tone: "danger" };
  if (event.startsAt < new Date()) return { label: "Past", tone: "muted" };
  if (event.status === "GROUPS_PUBLISHED") return { label: "Groups published", tone: "accent" };
  if (event.status === "CLOSED") return { label: "Registration closed", tone: "muted" };
  if (registeredCount >= event.capacity) return { label: "Full", tone: "warn" };
  return { label: "Registration open", tone: "ok" };
}

export function parseJson<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}
