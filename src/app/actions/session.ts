"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { DEMO_COOKIE, isDemoLoginEnabled } from "@/lib/session";
import { createSupabaseServerClient, isAuthConfigured } from "@/lib/supabase/server";
import { str, fail, done } from "./util";

/** The address of this site, used to build the link Supabase sends people back to. */
async function siteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function requireAuthConfigured() {
  if (!isAuthConfigured()) fail("/login", "Sign-in isn't set up yet: add the Supabase publishable key to .env.");
}

export async function sendMagicLink(formData: FormData) {
  requireAuthConfigured();
  const email = str(formData, "email").toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail("/login", "Enter a valid email address.");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${await siteOrigin()}/auth/callback` },
  });
  if (error) {
    const message = error.status === 429
      ? "Too many sign-in emails were sent. Please wait a few minutes and try again."
      : "We couldn't send the sign-in email. Please try again.";
    fail("/login", message);
  }
  done("/login",`Check your inbox: we sent a sign-in link to ${email}.`);
}

export async function signInWithGoogle() {
  requireAuthConfigured();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await siteOrigin()}/auth/callback` },
  });
  if (error || !data.url) fail("/login", "Google sign-in isn't available right now. Try the email link instead.");
  redirect(data.url);
}

/** Demo only: sign in as a seeded fictional user. Disabled unless DEMO_LOGIN="true". */
export async function signInDemo(formData: FormData) {
  if (!isDemoLoginEnabled()) fail("/login", "Demo sign-in is turned off.");
  const user = await prisma.user.findUnique({ where: { id: str(formData, "userId") } });
  if (!user) fail("/login", "That account does not exist.");
  (await cookies()).set(DEMO_COOKIE, user.id, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect(user.role === "ORGANIZER" ? "/organizer" : "/");
}

export async function signOut() {
  (await cookies()).delete(DEMO_COOKIE);
  if (isAuthConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
