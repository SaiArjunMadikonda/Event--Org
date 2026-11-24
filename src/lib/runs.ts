/**
 * Database side of group matching: build the engine input from an event's registrations,
 * store a preview, and publish it. All permission checks happen in the server actions.
 */
import { prisma } from "./db";
import { parseJson } from "./format";
import {
  runMatching,
  validateAssignment,
  type MatchingInput,
  type MatchingMethod,
  type UnassignedAttendee,
} from "./matching/engine";

export async function buildMatchingInput(
  eventId: string,
  method: MatchingMethod,
  seed: number,
): Promise<MatchingInput> {
  const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
  const registrations = await prisma.registration.findMany({
    where: { eventId, status: "REGISTERED" },
    orderBy: { createdAt: "asc" },
    include: { user: { include: { interests: { include: { interest: true } } } } },
  });
  const ids = registrations.map((r) => r.userId);
  const blocks = await prisma.block.findMany({
    where: { blockerId: { in: ids }, blockedId: { in: ids } },
  });

  return {
    attendees: registrations.map((r) => ({
      id: r.userId,
      interests: r.user.interests
        .filter((ui) => !event.interestCategory || ui.interest.category === event.interestCategory)
        .map((ui) => ui.interest.name),
    })),
    minGroupSize: event.minGroupSize,
    maxGroupSize: event.maxGroupSize,
    blocks: blocks.map((b) => [b.blockerId, b.blockedId] as [string, string]),
    method,
    seed,
  };
}

/** Run the matcher and store the result as the event's single open preview. */
export async function createPreview(eventId: string, method: MatchingMethod, createdById: string) {
  const seed = Math.floor(Math.random() * 2 ** 31);
  const input = await buildMatchingInput(eventId, method, seed);
  const result = runMatching(input);

  return prisma.$transaction(async (tx) => {
    // Only one open preview per event; older previews are kept as discarded history.
    await tx.matchingRun.updateMany({ where: { eventId, status: "PREVIEW" }, data: { status: "DISCARDED" } });
    const run = await tx.matchingRun.create({
      data: {
        eventId,
        method,
        seed,
        minGroupSize: input.minGroupSize,
        maxGroupSize: input.maxGroupSize,
        createdById,
        unassignedJson: JSON.stringify(result.unassigned),
      },
    });
    for (const [i, group] of result.groups.entries()) {
      await tx.group.create({
        data: {
          runId: run.id,
          number: i + 1,
          sharedInterestsJson: JSON.stringify(group.sharedInterests),
          members: { create: group.members.map((userId) => ({ userId, runId: run.id })) },
        },
      });
    }
    return run;
  });
}

export class PublishError extends Error {}

/**
 * Publish a preview. Re-checks it against the *current* registrations, size rule and blocks,
 * so a stale preview (someone joined, left, or blocked someone since) cannot be published.
 */
export async function publishRun(runId: string) {
  const run = await prisma.matchingRun.findUniqueOrThrow({
    where: { id: runId },
    include: { event: true, groups: { include: { members: true }, orderBy: { number: "asc" } } },
  });
  if (run.status !== "PREVIEW") throw new PublishError("Only a preview can be published.");
  if (run.event.status === "CANCELLED") throw new PublishError("This event is cancelled.");

  const current = await buildMatchingInput(run.eventId, run.method as MatchingMethod, run.seed);
  const stored = {
    groups: run.groups.map((g) => ({ members: g.members.map((m) => m.userId), sharedInterests: [] })),
    unassigned: parseJson<UnassignedAttendee[]>(run.unassignedJson, []),
  };
  const violations = validateAssignment(current, stored);
  if (violations.length > 0) {
    throw new PublishError(
      "Registrations, the group-size rule or blocks changed since this preview was made. Create a new preview. (" +
        violations.slice(0, 3).join("; ") +
        ")",
    );
  }

  await prisma.$transaction([
    prisma.matchingRun.updateMany({
      where: { eventId: run.eventId, status: "PUBLISHED" },
      data: { status: "DISCARDED" },
    }),
    prisma.matchingRun.update({ where: { id: runId }, data: { status: "PUBLISHED", publishedAt: new Date() } }),
    prisma.event.update({ where: { id: run.eventId }, data: { status: "GROUPS_PUBLISHED" } }),
  ]);
}
