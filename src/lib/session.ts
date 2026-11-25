import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User as AuthUser } from "@supabase/supabase-js";
import type { User as AppUser } from "@prisma/client";
import { prisma } from "./db";
import { isListedOrganizer } from "./organizers";
import { createSupabaseServerClient, isAuthConfigured } from "./supabase/server";

/**
 * Sign-in comes from Supabase Auth (email magic link or Google). Each Supabase user is linked to one
 * row in our User table (User.authId), which holds the profile, role and everything else.
 *
 * For local testing, DEMO_LOGIN="true" also allows signing in as a seeded fictional user through a
 * plain cookie. That path is NOT secure and must stay off for real users.
 */
export const DEMO_COOKIE = "demo_uid";

export function isDemoLoginEnabled() {
  return process.env.DEMO_LOGIN === "true";
}

/** People listed in ORGANIZER_EMAILS become organizers when they sign in (see lib/organizers.ts). */
async function promoteIfListed(user: AppUser): Promise<AppUser> {
  if (user.role === "ORGANIZER" || !isListedOrganizer(user.email)) return user;
  return prisma.user.update({ where: { id: user.id }, data: { role: "ORGANIZER" } });
}

/** Find the app user for a Supabase user, linking by email or creating one on first sign-in. */
export async function ensureAppUser(authUser: AuthUser) {
  const linked = await prisma.user.findUnique({ where: { authId: authUser.id } });
  if (linked) return { user: await promoteIfListed(linked), created: false };

  const email = authUser.email?.toLowerCase();
  if (!email) throw new Error("Signed-in account has no email address.");

  // Supabase has verified this email (magic link or Google), so an existing profile with it is theirs.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const user = await prisma.user.update({ where: { id: existing.id }, data: { authId: authUser.id } });
    return { user: await promoteIfListed(user), created: false };
  }

  const meta = authUser.user_metadata ?? {};
  const name = String(meta.full_name ?? meta.name ?? email.split("@")[0]).trim().slice(0, 80);
  const role = isListedOrganizer(email) ? "ORGANIZER" : "PARTICIPANT";
  const user = await prisma.user.create({ data: { authId: authUser.id, email, name, role } });
  return { user, created: true };
}

/** The signed-in user, or null. Cached so each request asks Supabase only once. */
export const getCurrentUser = cache(async () => {
  if (isDemoLoginEnabled()) {
    const demoId = (await cookies()).get(DEMO_COOKIE)?.value;
    if (demoId) {
      const demoUser = await prisma.user.findUnique({ where: { id: demoId } });
      if (demoUser) return demoUser;
    }
  }

  if (!isAuthConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return (await ensureAppUser(data.user)).user;
});

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
