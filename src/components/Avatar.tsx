import { hueFor, initials } from "@/lib/activity";

export function Avatar({ name, size = 36, ring = false }: { name: string; size?: number; ring?: boolean }) {
  return (
    <span
      className={ring ? "avatar ring" : "avatar"}
      style={{ ["--h" as string]: hueFor(name), width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
