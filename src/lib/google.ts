import "server-only";
import { appUrl } from "./notify";

/*
 * Google sign-in (OAuth 2.0 authorization-code flow, no extra libraries).
 * Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET; add `${APP_URL}/api/auth/google/callback`
 * as an authorised redirect URI in Google Cloud Console. The button hides itself when unset.
 */

export function googleEnabled() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function googleRedirectUri() {
  return `${appUrl()}/api/auth/google/callback`;
}

export function googleAuthUrl(state: string) {
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  u.searchParams.set("redirect_uri", googleRedirectUri());
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", "openid email profile");
  u.searchParams.set("state", state);
  u.searchParams.set("prompt", "select_account");
  return u.toString();
}

export async function googleProfile(code: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Google token exchange failed (${res.status})`);
  const { access_token } = (await res.json()) as { access_token: string };
  const info = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!info.ok) throw new Error("Google profile fetch failed");
  return (await info.json()) as { sub: string; email: string; email_verified: boolean; name: string; picture?: string };
}
