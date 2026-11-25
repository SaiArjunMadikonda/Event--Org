/**
 * Organizer onboarding rules.
 *
 * People become organizers in one of two ways:
 *  1. They apply, and an existing organizer approves the application.
 *  2. Their email is listed in ORGANIZER_EMAILS. This is how the very first organizer gets in on a fresh
 *     site, since nobody exists yet to approve them. It only applies to real sign-ins (Supabase has verified
 *     the email), never to demo accounts.
 */

export const APPLICATION_LIMITS = { plans: 1000, area: 100, experience: 1000 } as const;

/** Parse a comma- or whitespace-separated list of emails into a lowercase set. */
export function parseOrganizerEmails(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(/[\s,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes("@")),
  );
}

export function isListedOrganizer(email: string, raw = process.env.ORGANIZER_EMAILS): boolean {
  return parseOrganizerEmails(raw).has(email.trim().toLowerCase());
}

export type ApplicationStatus = "PENDING" | "APPROVED" | "DECLINED";

/** What the "Become an organizer" page should show, given the user's role and their latest application. */
export function onboardingState(
  role: string,
  latest: { status: string } | null,
): "ORGANIZER" | "PENDING" | "CAN_APPLY" {
  if (role === "ORGANIZER") return "ORGANIZER";
  if (latest?.status === "PENDING") return "PENDING";
  // Never applied, declined (may try again), or approved but later changed back to participant.
  return "CAN_APPLY";
}

export type ApplicationInput = { plans: string; area: string; experience: string };

/** Returns an error message, or null when the application can be submitted. */
export function validateApplication(input: ApplicationInput): string | null {
  if (!input.plans || !input.area) return "Tell us what you'd like to organize and where.";
  if (input.plans.length > APPLICATION_LIMITS.plans) return `Keep your plans under ${APPLICATION_LIMITS.plans} characters.`;
  if (input.area.length > APPLICATION_LIMITS.area) return `Keep the area under ${APPLICATION_LIMITS.area} characters.`;
  if (input.experience.length > APPLICATION_LIMITS.experience)
    return `Keep your experience under ${APPLICATION_LIMITS.experience} characters.`;
  return null;
}
