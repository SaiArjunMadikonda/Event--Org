import { DEFAULT_TIME_ZONE } from "./timezones";

/** Date and time without a zone label. Used for app timestamps (e.g. when groups were published). */
export function formatDateTime(d: Date, timeZone = DEFAULT_TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(d);
}

/** When an event happens, in the event's own time zone, with the zone shown, e.g. "Sat, Dec 5, 7:00 PM CST". */
export function formatEventDateTime(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone,
  }).format(d);
}

/** Time of day only, e.g. "9:00 PM CST". */
export function formatEventTime(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone,
  }).format(d);
}

export function formatDate(d: Date, timeZone = DEFAULT_TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone }).format(d);
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
