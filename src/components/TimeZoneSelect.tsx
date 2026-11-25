"use client";

import { useEffect, useRef } from "react";
import { DEFAULT_TIME_ZONE, TIME_ZONE_OPTIONS } from "@/lib/timezones";

/**
 * Time zone picker for an event. Starts on the organizer's own browser time zone when it's one we list,
 * unless the page came back with an error (then FormMemory has already restored what they chose).
 */
export function TimeZoneSelect({ id = "timeZone", name = "timeZone" }: { id?: string; name?: string }) {
  const ref = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (!ref.current || new URLSearchParams(window.location.search).has("error")) return;
    const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (TIME_ZONE_OPTIONS.some((o) => o.value === browserZone)) ref.current.value = browserZone;
  }, []);

  return (
    <select ref={ref} id={id} name={name} defaultValue={DEFAULT_TIME_ZONE} required>
      {TIME_ZONE_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
