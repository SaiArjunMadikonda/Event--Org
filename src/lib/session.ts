import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";

/**
 * Demo sign-in: the signed-in user's id lives in a cookie.
 * This is deliberately simple for the local prototype and is NOT secure.
 * Replace with Supabase Auth before anything is deployed for real users.
 */
export const SESSION_COOKIE = "demo_uid";

export async function getCurrentUser() {
  const id = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!id) return null;
  return prisma.user.findUnique({ where: { id } });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireOrganizer() {
  const user = await requireUser();
  if (user.role !== "ORGANIZER") redirect("/?error=" + encodeURIComponent("That page is for organizers."));
  return user;
}
