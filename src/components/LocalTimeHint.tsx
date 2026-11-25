"use client";

import { useEffect, useState } from "react";

/**
 * Shows "That's 8:00 PM your time (Sat, Dec 5)" when the viewer's browser is in a different time zone from
 * the event. Renders nothing on the server and for viewers already in the event's zone.
 */
export function LocalTimeHint({ iso, timeZone }: { iso: string; timeZone: string }) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    const d = new Date(iso);
    const opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" };
    const there = new Intl.DateTimeFormat("en-US", { ...opts, timeZone }).format(d);
    const here = new Intl.DateTimeFormat("en-US", opts).format(d);
    if (here === there) return; // same wall-clock time, so no need to convert
    const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(d);
    const day = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(d);
    setText(`That's ${time} your time (${day})`);
  }, [iso, timeZone]);

  return text ? <div className="muted small">{text}</div> : null;
}
