import { prisma } from "./db";
import { parseJson } from "./format";
import type { UnassignedAttendee } from "./matching/engine";

/**
 * The signed-in attendee's view of an event's published groups.
 * Returns only what that attendee is allowed to see: their own group, never anyone else's.
 */
export async function getMyAssignment(eventId: string, userId: string) {
  const run = await prisma.matchingRun.findFirst({
    where: { eventId, status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
  });
  if (!run) return { state: "NOT_PUBLISHED" as const };

  const membership = await prisma.groupMember.findUnique({
    where: { runId_userId: { runId: run.id, userId } },
    include: {
      group: {
        include: {
          members: {
            include: {
              user: {
                include: {
                  interests: { include: { interest: true } },
                  registrations: { where: { eventId }, select: { status: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!membership) {
    const unassigned = parseJson<UnassignedAttendee[]>(run.unassignedJson, []);
    return { state: unassigned.some((u) => u.id === userId) ? ("UNASSIGNED" as const) : ("NOT_IN_RUN" as const), run };
  }

  return {
    state: "ASSIGNED" as const,
    run,
    group: membership.group,
    sharedInterests: parseJson<string[]>(membership.group.sharedInterestsJson, []),
  };
}
