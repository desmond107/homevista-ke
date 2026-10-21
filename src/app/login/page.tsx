import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser, homeFor, safeNext } from "@/lib/auth";
import { googleEnabled } from "@/lib/google";
import { AuthShell, Divider, GoogleButton } from "@/components/AuthShell";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

const ERRORS: Record<string, string> = {
  google: "Google sign-in didn't complete. Please try again.",
  "google-disabled": "Google sign-in isn't configured yet. Use email and password.",
  "google-unverified": "Your Google email isn't verified.",
  suspended: "This account is suspended. Contact support.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const user = await getUser();
  if (user) redirect(safeNext(sp.next, homeFor(user.role)));
  const next = safeNext(sp.next, "");
  return (
    <AuthShell title="Welcome back" intro="Sign in to see your saved homes, unlocked properties and listings.">
      {sp.error && ERRORS[sp.error] && <p className="mb-5 rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{ERRORS[sp.error]}</p>}
      {googleEnabled() && (
        <>
          <GoogleButton href={`/api/auth/google${next ? `?next=${encodeURIComponent(next)}` : ""}`} />
          <Divider label="or sign in with email" />
        </>
      )}
      <LoginForm next={next} />
      <p className="mt-6 text-center text-sm text-ink-2">
        New to HomeVista Ke?{" "}
        <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="link font-medium">
          Create a free account
        </Link>
      </p>
      {process.env.NODE_ENV !== "production" && (
        <div className="mt-8 rounded-2xl border border-dashed border-line-strong p-4 text-xs text-ink-2">
          <p className="mb-1 font-semibold text-ink">Demo accounts (password: HomeVista-dev-2026)</p>
          <ul className="space-y-0.5">
            <li>admin@homevista.co.ke — super admin</li>
            <li>grace@vistaprime.co.ke — verified lister</li>
            <li>wanjiku@example.com — property seeker</li>
          </ul>
        </div>
      )}
    </AuthShell>
  );
}
