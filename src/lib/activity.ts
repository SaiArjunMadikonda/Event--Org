/**
 * A visual identity for each activity: an emoji and a hue used for its colour wash.
 * Matched on keywords in the activity label, so organizers don't have to pick anything.
 */
const RULES: [RegExp, string, number][] = [
  [/movie|film|cinema/i, "🎬", 268],
  [/dinner|food|lunch|brunch|cook|supper/i, "🍜", 18],
  [/badminton|tennis|pickleball|squash/i, "🏸", 152],
  [/board|game|cards?\b|chess/i, "🎲", 205],
  [/coffee|caf[eé]|tea\b/i, "☕", 30],
  [/music|jam|sing|concert|karaoke|choir/i, "🎵", 322],
  [/walk|hike|trail|park|nature/i, "🥾", 115],
  [/run|cycl|bike|yoga|fitness|gym/i, "🏃", 175],
  [/trivia|quiz|puzzle/i, "🧠", 285],
  [/art|paint|craft|photo|draw/i, "🎨", 345],
  [/book|read|writ/i, "📚", 42],
  [/soccer|football|cricket|basket|volley/i, "⚽", 95],
];

export type ActivityVisual = { emoji: string; hue: number };

export function activityVisual(activity: string): ActivityVisual {
  for (const [re, emoji, hue] of RULES) if (re.test(activity)) return { emoji, hue };
  return { emoji: "✨", hue: hueFor(activity) };
}

/** A stable hue (0–359) for any string, used for avatars and unknown activities. */
export function hueFor(text: string): number {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}
