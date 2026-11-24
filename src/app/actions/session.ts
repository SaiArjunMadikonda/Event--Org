"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/session";
import { str, fail } from "./util";

export async function signIn(formData: FormData) {
  const userId = str(formData, "userId");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) fail("/login", "That account does not exist.");
  (await cookies()).set(SESSION_COOKIE, user.id, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect(user.role === "ORGANIZER" ? "/organizer" : "/");
}

export async function createAccount(formData: FormData) {
  const name = str(formData, "name");
  const email = str(formData, "email").toLowerCase();
  const city = str(formData, "city");
  if (!name || !email) fail("/login", "Name and email are required.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail("/login", "Enter a valid email address.");
  if (await prisma.user.findUnique({ where: { email } })) fail("/login", "An account with that email already exists.");

  const user = await prisma.user.create({ data: { name, email, city } });
  (await cookies()).set(SESSION_COOKIE, user.id, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect("/profile?notice=" + encodeURIComponent("Welcome! Pick a few interests so we can group you well."));
}

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
