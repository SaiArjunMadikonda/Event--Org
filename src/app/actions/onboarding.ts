"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireOrganizer, requireUser } from "@/lib/session";
import { onboardingState, validateApplication } from "@/lib/organizers";
import { done, fail, str } from "./util";

/** A participant asks to become an organizer. */
export async function applyToOrganize(formData: FormData) {
  const user = await requireUser();
  const back = "/organize";
  const latest = await prisma.organizerApplication.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  const state = onboardingState(user.role, latest);
  if (state === "ORGANIZER") fail("/organizer", "You're already an organizer.");
  if (state === "PENDING") fail(back, "Your application is already waiting for review.");

  const input = { plans: str(formData, "plans"), area: str(formData, "area"), experience: str(formData, "experience") };
  const problem = validateApplication(input);
  if (problem) fail(back, problem);

  await prisma.organizerApplication.create({ data: { userId: user.id, ...input } });
  revalidatePath("/organizer");
  done(back, "Thanks! Your application was sent. An organizer will review it.");
}

/** An organizer approves or declines a pending application. Approving makes the applicant an organizer. */
export async function reviewApplication(formData: FormData) {
  const reviewer = await requireOrganizer();
  const back = "/organizer/applications";
  const applicationId = str(formData, "applicationId");
  const decision = str(formData, "decision");
  const note = str(formData, "reviewerNote").slice(0, 500);
  if (decision !== "APPROVE" && decision !== "DECLINE") fail(back, "Choose approve or decline.");

  const application = await prisma.organizerApplication.findUnique({
    where: { id: applicationId },
    include: { user: { select: { name: true } } },
  });
  if (!application) fail(back, "Application not found.");
  if (application.userId === reviewer.id) fail(back, "You can't review your own application.");

  const status = decision === "APPROVE" ? "APPROVED" : "DECLINED";
  const updated = await prisma.$transaction(async (tx) => {
    // Only a still-pending application can be decided, so two organizers can't both act on it.
    const { count } = await tx.organizerApplication.updateMany({
      where: { id: application.id, status: "PENDING" },
      data: { status, reviewerNote: note, reviewedById: reviewer.id, reviewedAt: new Date() },
    });
    if (count === 1 && status === "APPROVED") {
      await tx.user.update({ where: { id: application.userId }, data: { role: "ORGANIZER" } });
    }
    return count;
  });
  if (updated === 0) fail(back, "That application was already reviewed.");

  revalidatePath(back);
  revalidatePath("/organizer");
  done(
    back,
    status === "APPROVED"
      ? `${application.user.name} is now an organizer.`
      : `Declined ${application.user.name}'s application.`,
  );
}
