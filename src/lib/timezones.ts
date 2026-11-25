/**
 * Event time zones.
 *
 * Each event stores the IANA time zone it happens in (Event.timeZone). Organizers enter a local "wall clock"
 * time in that zone, which we convert to a real instant here, on the server, without depending on the server's
 * own time zone (hosted servers usually run in UTC). Event times are then always shown in the event's zone.
 */

/** The demo events are in Dallas–Fort Worth; also used for timestamps that aren't tied to an event. */
export const DEFAULT_TIME_ZONE = "America/Chicago";

export const TIME_ZONE_OPTIONS: { value: string; label: string }[] = [
  { value: "America/New_York", label: "US Eastern (New York)" },
  { value: "America/Chicago", label: "US Central (Chicago, Dallas)" },
  { value: "America/Denver", label: "US Mountain (Denver)" },
  { value: "America/Phoenix", label: "Arizona (Phoenix)" },
  { value: "America/Los_Angeles", label: "US Pacific (Los Angeles)" },
  { value: "America/Anchorage", label: "Alaska (Anchorage)" },
  { value: "Pacific/Honolulu", label: "Hawaii (Honolulu)" },
  { value: "America/Toronto", label: "Canada Eastern (Toronto)" },
  { value: "America/Vancouver", label: "Canada Pacific (Vancouver)" },
  { value: "America/Mexico_City", label: "Mexico City" },
  { value: "America/Sao_Paulo", label: "São Paulo" },
  { value: "Europe/London", label: "UK (London)" },
  { value: "Europe/Berlin", label: "Central Europe (Berlin, Paris)" },
  { value: "Africa/Lagos", label: "West Africa (Lagos)" },
  { value: "Asia/Dubai", label: "Gulf (Dubai)" },
  { value: "Asia/Kolkata", label: "India (Kolkata, Hyderabad)" },
  { value: "Asia/Singapore", label: "Singapore" },
  { value: "Asia/Tokyo", label: "Japan (Tokyo)" },
  { value: "Australia/Sydney", label: "Australia Eastern (Sydney)" },
];

const SUPPORTED = new Set(TIME_ZONE_OPTIONS.map((o) => o.value));

export function isSupportedTimeZone(tz: string): boolean {
  return SUPPORTED.has(tz);
}

/** The wall-clock time of instant `d` in `timeZone`, as "YYYY-MM-DDTHH:mm" (the datetime-local format). */
export function toZonedLocal(d: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** Minutes the zone is ahead of UTC at instant `utcMs` (e.g. -300 for US Central in summer). */
function offsetMinutes(utcMs: number, timeZone: string): number {
  const [date, time] = toZonedLocal(new Date(utcMs), timeZone).split("T");
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const wallAsUtc = Date.UTC(y, mo - 1, d, h, mi);
  return Math.round((wallAsUtc - Math.floor(utcMs / 60_000) * 60_000) / 60_000);
}

/**
 * Convert a wall-clock time ("YYYY-MM-DDTHH:mm", seconds optional) in `timeZone` to the real instant.
 * Returns null for malformed input, or for a time that doesn't exist because clocks jump forward
 * (e.g. 2:30 AM on the US spring daylight-saving night).
 */
export function zonedLocalToUtc(local: string, timeZone: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?$/.exec(local);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  if (Number.isNaN(wall)) return null;

  // Guess with the offset at the wall time, then correct once with the offset at the guessed instant.
  let utc = wall - offsetMinutes(wall, timeZone) * 60_000;
  utc = wall - offsetMinutes(utc, timeZone) * 60_000;

  const wanted = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}`;
  return toZonedLocal(new Date(utc), timeZone) === wanted ? new Date(utc) : null;
}
