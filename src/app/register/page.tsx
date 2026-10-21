import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser, homeFor, safeNext } from "@/lib/auth";
import { googleEnabled } from "@/lib/google";
import { getSettings } from "@/lib/settings";
import { AuthShell, Divider, GoogleButton } from "@/components/AuthShell";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "Create an account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ as?: string; next?: string }> }) {
  const sp = await searchParams;
  const user = await getUser();
  if (user) redirect(homeFor(user.role));
  const settings = await getSettings();
  const as = sp.as === "lister" ? "lister" : "seeker";
  const next = safeNext(sp.next, "");
  return (
    <AuthShell
      title={as === "lister" ? "List with HomeVista Ke" : "Create your account"}
      intro={
        as === "lister"
          ? `Reach serious buyers and tenants across Kenya. Unlimited listings for KSh ${settings.subscriptionPrice.toLocaleString()}/month after a quick verification.`
          : "Free forever. Save homes, set alerts and unlock any property's contacts via M-Pesa."
      }
      image={as === "lister" ? "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=80" : undefined}
    >
      {googleEnabled() && (
        <>
          <GoogleButton href={`/api/auth/google?as=${as}${next ? `&next=${encodeURIComponent(next)}` : ""}`} />
          <Divider label="or register with email" />
        </>
      )}
      <RegisterForm initialAs={as} next={next} />
      <p className="mt-6 text-center text-sm text-ink-2">
        Already have an account?{" "}
        <Link href="/login" className="link font-medium">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
