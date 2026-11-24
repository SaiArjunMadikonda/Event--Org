"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireOrganizer } from "@/lib/session";
import { createPreview, publishRun, PublishError } from "@/lib/runs";
import type { MatchingMethod } from "@/lib/matching/engine";
import { done, fail, int, str } from "./util";

/** Load an event and make sure the signed-in organizer owns it. */
async function ownedEvent(eventId: string) {
  const user = await requireOrganizer();
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) fail("/organizer", "Event not found.");
  if (event.organizerId !== user.id) fail("/organizer", "Only this event's organizer can do that.");
  return { user, event };
}

function readGroupRule(formData: FormData, back: string) {
  const min = int(formData, "minGroupSize");
  const max = int(formData, "maxGroupSize");
  if (min === null || max === null || Number.isNaN(min) || Number.isNaN(max)) fail(back, "Enter whole numbers for group size.");
  if (min < 2 || max > 50 || min > max) fail(back, "Group size must be between 2 and 50, with min ≤ max.");
  return { min, max };
}

export async function createEvent(formData: FormData) {
  const user = await requireOrganizer();
  const back = "/organizer/events/new";
  const title = str(formData, "title");
  const activity = str(formData, "activity");
  const description = str(formData, "description");
  const area = str(formData, "area");
  const meetingPoint = str(formData, "meetingPoint");
  const startsAtRaw = str(formData, "startsAt");
  const capacity = int(formData, "capacity");
  const duration = int(formData, "durationMinutes");
  const { min, max } = readGroupRule(formData, back);

  if (!title || !activity || !description || !area || !meetingPoint || !startsAtRaw)
    fail(back, "Please fill in every required field.");
  const startsAt = new Date(startsAtRaw);
  if (Number.isNaN(startsAt.getTime())) fail(back, "Enter a valid date and time.");
  if (startsAt < new Date()) fail(back, "The event must start in the future.");
  if (capacity === null || Number.isNaN(capacity) || capacity < min) fail(back, "Capacity must be at least the minimum group size.");
  if (capacity > 500) fail(back, "Capacity can be at most 500 for now.");

  const event = await prisma.event.create({
    data: {
      title,
      activity,
      description,
      whatToExpect: str(formData, "whatToExpect"),
      startsAt,
      durationMinutes: duration && !Number.isNaN(duration) && duration > 0 ? duration : 120,
      area,
      meetingPoint,
      costEstimate: str(formData, "costEstimate") || "Free",
      capacity,
      minGroupSize: min,
      maxGroupSize: max,
      interestCategory: str(formData, "interestCategory") || null,
      registrationQuestion: str(formData, "registrationQuestion") || null,
      organizerId: user.id,
    },
  });
  revalidatePath("/");
  done(`/organizer/events/${event.id}`, "Event created and open for registration.");
}

export async function setEventStatus(formData: FormData) {
  const eventId = str(formData, "eventId");
  const status = str(formData, "status");
  const back = `/organizer/events/${eventId}`;
  const { event } = await ownedEvent(eventId);
  if (!["OPEN", "CLOSED", "CANCELLED"].includes(status)) fail(back, "Unknown status.");
  if (event.status === "CANCELLED") fail(back, "This event is already cancelled.");
  if (event.status === "GROUPS_PUBLISHED" && status === "OPEN")
    fail(back, "Groups are already published. Reopening registration would leave new people without a group.");
  await prisma.event.update({ where: { id: eventId }, data: { status } });
  revalidatePath("/");
  done(back, status === "CANCELLED" ? "Event cancelled. Attendees will see it as cancelled." : "Event status updated.");
}

export async function updateGroupRule(formData: FormData) {
  const eventId = str(formData, "eventId");
  const back = `/organizer/events/${eventId}`;
  const { event } = await ownedEvent(eventId);
  const { min, max } = readGroupRule(formData, back);
  if (event.status === "GROUPS_PUBLISHED") fail(back, "Groups are already published.");
  await prisma.event.update({ where: { id: eventId }, data: { minGroupSize: min, maxGroupSize: max } });
  done(back, `Group size rule set to ${min}–${max}. Create a new preview to apply it.`);
}

export async function generatePreview(formData: FormData) {
  const eventId = str(formData, "eventId");
  const back = `/organizer/events/${eventId}`;
  const { user, event } = await ownedEvent(eventId);
  const method = str(formData, "method") as MatchingMethod;
  if (method !== "INTEREST" && method !== "RANDOM") fail(back, "Choose a grouping method.");
  if (event.status === "CANCELLED") fail(back, "This event is cancelled.");
  await createPreview(eventId, method, user.id);
  done(back + "#matching", "Group preview created. Review it before publishing.");
}

export async function publishPreview(formData: FormData) {
  const runId = str(formData, "runId");
  const run = await prisma.matchingRun.findUnique({ where: { id: runId } });
  if (!run) fail("/organizer", "Preview not found.");
  const back = `/organizer/events/${run.eventId}`;
  await ownedEvent(run.eventId);

  let message: string | null = null;
  try {
    await publishRun(runId);
  } catch (e) {
    if (e instanceof PublishError) message = e.message;
    else throw e;
  }
  if (message) fail(back + "#matching", message);
  revalidatePath("/");
  done(back + "#matching", "Groups published. Each attendee can now see their group.");
}

export async function discardPreview(formData: FormData) {
  const runId = str(formData, "runId");
  const run = await prisma.matchingRun.findUnique({ where: { id: runId } });
  if (!run) fail("/organizer", "Preview not found.");
  await ownedEvent(run.eventId);
  if (run.status !== "PREVIEW") fail(`/organizer/events/${run.eventId}`, "Only a preview can be discarded.");
  await prisma.matchingRun.update({ where: { id: runId }, data: { status: "DISCARDED" } });
  done(`/organizer/events/${run.eventId}#matching`, "Preview discarded.");
}

export async function updateActivityRequest(formData: FormData) {
  await requireOrganizer();
  const id = str(formData, "requestId");
  const status = str(formData, "status");
  if (!["NEW", "REVIEWING", "PLANNED", "DECLINED"].includes(status)) fail("/organizer/requests", "Unknown status.");
  await prisma.activityRequest.update({
    where: { id },
    data: { status, organizerNote: str(formData, "organizerNote").slice(0, 500) },
  });
  done("/organizer/requests", "Request updated.");
}

export async function resolveReport(formData: FormData) {
  await requireOrganizer();
  await prisma.report.update({ where: { id: str(formData, "reportId") }, data: { status: "RESOLVED" } });
  done("/organizer", "Report marked resolved.");
}
