import { NextResponse, type NextRequest } from "next/server";
import { ensureAppUser } from "@/lib/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Where Supabase sends people after they click the email link or finish Google sign-in.
 * Exchanges the one-time code for a session cookie, then links or creates their profile.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const back = (path: string) => NextResponse.redirect(new URL(path, origin));
  const loginError = (message: string) => back(`/login?error=${encodeURIComponent(message)}`);

  const providerError = searchParams.get("error_description");
  if (providerError) return loginError(`Sign-in didn't finish: ${providerError}`);

  const code = searchParams.get("code");
  if (!code) return loginError("That sign-in link is incomplete. Please request a new one.");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return loginError("That sign-in link has expired or was already used. Please request a new one, in this same browser.");
  }

  const { user, created } = await ensureAppUser(data.user);
  if (created) {
    return back(`/profile?notice=${encodeURIComponent("Welcome! Add your city and a few interests so we can group you well.")}`);
  }
  return back(user.role === "ORGANIZER" ? "/organizer" : "/");
}
