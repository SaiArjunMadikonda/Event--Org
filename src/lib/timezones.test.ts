import { describe, expect, it } from "vitest";
import { isSupportedTimeZone, toZonedLocal, zonedLocalToUtc } from "./timezones";
import { formatEventDateTime, formatEventTime } from "./format";

describe("zonedLocalToUtc", () => {
  it("converts US Central in winter (UTC-6) and summer (UTC-5)", () => {
    expect(zonedLocalToUtc("2026-12-05T19:00", "America/Chicago")?.toISOString()).toBe("2026-12-06T01:00:00.000Z");
    expect(zonedLocalToUtc("2026-07-04T19:00", "America/Chicago")?.toISOString()).toBe("2026-07-05T00:00:00.000Z");
  });

  it("handles half-hour and no-DST zones", () => {
    expect(zonedLocalToUtc("2026-12-05T19:00", "Asia/Kolkata")?.toISOString()).toBe("2026-12-05T13:30:00.000Z");
    expect(zonedLocalToUtc("2026-07-04T09:00", "America/Phoenix")?.toISOString()).toBe("2026-07-04T16:00:00.000Z");
  });

  it("is independent of the server's own time zone and accepts seconds", () => {
    expect(zonedLocalToUtc("2026-12-05T19:00:00", "Europe/London")?.toISOString()).toBe("2026-12-05T19:00:00.000Z");
  });

  it("rejects a time skipped by the spring daylight-saving jump", () => {
    expect(zonedLocalToUtc("2026-03-08T02:30", "America/Chicago")).toBeNull();
  });

  it("picks a real instant for the repeated hour in autumn", () => {
    const d = zonedLocalToUtc("2026-11-01T01:30", "America/Chicago");
    expect(d).not.toBeNull();
    expect(toZonedLocal(d!, "America/Chicago")).toBe("2026-11-01T01:30");
  });

  it("rejects malformed input", () => {
    expect(zonedLocalToUtc("", "America/Chicago")).toBeNull();
    expect(zonedLocalToUtc("2026-12-05 19:00", "America/Chicago")).toBeNull();
    expect(zonedLocalToUtc("2026-02-30T10:00", "America/Chicago")).toBeNull();
  });

  it("round-trips through toZonedLocal", () => {
    for (const tz of ["America/New_York", "America/Los_Angeles", "Asia/Tokyo", "Australia/Sydney"]) {
      const d = zonedLocalToUtc("2026-06-15T08:45", tz);
      expect(d && toZonedLocal(d, tz)).toBe("2026-06-15T08:45");
    }
  });
});

describe("isSupportedTimeZone", () => {
  it("accepts listed zones only", () => {
    expect(isSupportedTimeZone("America/Chicago")).toBe(true);
    expect(isSupportedTimeZone("Mars/Olympus_Mons")).toBe(false);
    expect(isSupportedTimeZone("")).toBe(false);
  });
});

describe("event time formatting", () => {
  it("shows the time in the event's zone with its abbreviation", () => {
    const d = new Date("2026-12-06T01:00:00Z");
    expect(formatEventDateTime(d, "America/Chicago")).toBe("Sat, Dec 5, 7:00 PM CST");
    expect(formatEventDateTime(d, "America/New_York")).toBe("Sat, Dec 5, 8:00 PM EST");
    expect(formatEventTime(d, "America/Chicago")).toBe("7:00 PM CST");
  });
});
