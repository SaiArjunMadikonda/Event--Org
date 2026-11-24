"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { done, fail, int, safePath, str } from "./util";

class JoinError extends Error {}

export async function joinEvent(formData: FormData) {
  const user = await requireUser();
  const eventId = str(formData, "eventId");
  const answer = str(formData, "answer").slice(0, 500);
  const back = `/events/${eventId}`;

  let message: string | null = null;
  try {
    // Capacity check and insert happen in one transaction so two people can't take the last spot.
    await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({ where: { id: eventId } });
      if (!event) throw new JoinError("Event not found.");
      if (event.status !== "OPEN") throw new JoinError("Registration is not open for this event.");
      if (event.startsAt < new Date()) throw new JoinError("This event has already started.");
      const existing = await tx.registration.findUnique({ where: { eventId_userId: { eventId, userId: user.id } } });
      if (existing?.status === "REGISTERED") throw new JoinError("You're already registered.");
      const count = await tx.registration.count({ where: { eventId, status: "REGISTERED" } });
      if (count >= event.capacity) throw new JoinError("Sorry, this event is full.");
      await tx.registration.upsert({
        where: { eventId_userId: { eventId, userId: user.id } },
        create: { eventId, userId: user.id, answer },
        update: { status: "REGISTERED", answer, createdAt: new Date() },
      });
    });
  } catch (e) {
    if (e instanceof JoinError) message = e.message;
    else throw e;
  }
  if (message) fail(back, message);
  revalidatePath("/");
  done(back, "You're registered! Your group will appear here once the organizer publishes groups.");
}

export async function leaveEvent(formData: FormData) {
  const user = await requireUser();
  const eventId = str(formData, "eventId");
  const back = `/events/${eventId}`;
  const reg = await prisma.registration.findUnique({ where: { eventId_userId: { eventId, userId: user.id } } });
  if (!reg || reg.status !== "REGISTERED") fail(back, "You're not registered for this event.");
  await prisma.registration.update({ where: { id: reg.id }, data: { status: "CANCELLED" } });
  revalidatePath("/");
  done(back, "You've left this event. The organizer can see that your spot is free.");
}

export async function updateProfile(formData: FormData) {
  const user = await requireUser();
  const name = str(formData, "name");
  if (!name) fail("/profile", "Name is required.");
  const interestIds = formData.getAll("interest").filter((v): v is string => typeof v === "string");
  const valid = await prisma.interest.findMany({ where: { id: { in: interestIds } }, select: { id: true } });

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        name,
        city: str(formData, "city"),
        bio: str(formData, "bio").slice(0, 280),
        shareBioWithGroup: formData.get("shareBioWithGroup") === "on",
      },
    }),
    prisma.userInterest.deleteMany({ where: { userId: user.id } }),
    prisma.userInterest.createMany({ data: valid.map((i) => ({ userId: user.id, interestId: i.id })) }),
  ]);
  done("/profile", "Profile saved.");
}

export async function submitActivityRequest(formData: FormData) {
  const user = await requireUser();
  const activity = str(formData, "activity");
  const area = str(formData, "area");
  const timeWindow = str(formData, "timeWindow");
  const groupSizeMin = int(formData, "groupSizeMin");
  const groupSizeMax = int(formData, "groupSizeMax");
  const budgetMax = int(formData, "budgetMax");

  if (!activity || !area || !timeWindow) fail("/suggest", "Activity, location and time are required.");
  if (groupSizeMin === null || groupSizeMax === null || Number.isNaN(groupSizeMin) || Number.isNaN(groupSizeMax))
    fail("/suggest", "Enter a preferred group size.");
  if (groupSizeMin < 2 || groupSizeMax > 50 || groupSizeMin > groupSizeMax)
    fail("/suggest", "Group size should be between 2 and 50, with the minimum no larger than the maximum.");
  if (budgetMax !== null && (Number.isNaN(budgetMax) || budgetMax < 0)) fail("/suggest", "Budget must be a whole number.");

  await prisma.activityRequest.create({
    data: {
      userId: user.id,
      activity,
      experienceLevel: str(formData, "experienceLevel") || "Any",
      area,
      timeWindow,
      budgetMax,
      groupSizeMin,
      groupSizeMax,
      notes: str(formData, "notes").slice(0, 500),
    },
  });
  done("/suggest", "Thanks! Your request was sent to organizers. This isn't a booking yet — we'll let you know if an event is planned.");
}

export async function blockUser(formData: FormData) {
  const user = await requireUser();
  const blockedId = str(formData, "userId");
  const back = safePath(str(formData, "returnTo"), "/profile");
  if (blockedId === user.id) fail(back, "You can't block yourself.");
  if (!(await prisma.user.findUnique({ where: { id: blockedId } }))) fail(back, "User not found.");
  await prisma.block.upsert({
    where: { blockerId_blockedId: { blockerId: user.id, blockedId } },
    create: { blockerId: user.id, blockedId },
    update: {},
  });
  done(back, "Blocked. You won't be grouped with this person in future matching.");
}

export async function unblockUser(formData: FormData) {
  const user = await requireUser();
  const blockedId = str(formData, "userId");
  await prisma.block.deleteMany({ where: { blockerId: user.id, blockedId } });
  done("/profile", "Unblocked.");
}

export async function reportUser(formData: FormData) {
  const user = await requireUser();
  const back = safePath(str(formData, "returnTo"), "/");
  const reason = str(formData, "reason").slice(0, 1000);
  if (!reason) fail(back, "Please describe the problem.");
  const reportedUserId = str(formData, "reportedUserId") || null;
  const eventId = str(formData, "eventId") || null;
  await prisma.report.create({ data: { reporterId: user.id, reportedUserId, eventId, reason } });
  done(back, "Report sent to the organizer. Thank you for letting us know.");
}
