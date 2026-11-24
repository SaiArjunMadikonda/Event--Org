import { redirect } from "next/navigation";

export function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export function int(formData: FormData, key: string): number | null {
  const s = str(formData, key);
  if (s === "") return null;
  const n = Number(s);
  return Number.isInteger(n) ? n : NaN;
}

/** Send the user back to `path` with an error message shown at the top of the page. */
export function fail(path: string, message: string): never {
  redirect(withParam(path, "error", message));
}

export function done(path: string, message: string): never {
  redirect(withParam(path, "notice", message));
}

function withParam(path: string, key: string, value: string): string {
  const [base, hash] = path.split("#");
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}${key}=${encodeURIComponent(value)}${hash ? `#${hash}` : ""}`;
}

/** Only allow redirects back to pages inside this app. */
export function safePath(path: string, fallback = "/"): string {
  return path.startsWith("/") && !path.startsWith("//") ? path : fallback;
}
