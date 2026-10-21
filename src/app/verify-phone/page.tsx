import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser, homeFor, safeNext } from "@/lib/auth";
import { AuthShell } from "@/components/AuthShell";
import { prettyPhone } from "@/lib/format";
import { VerifyPhoneForm } from "./VerifyPhoneForm";

export const metadata: Metadata = { title: "Verify your phone", robots: { index: false } };

export default async function VerifyPhonePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const user = await getUser();
  if (!user) redirect("/login?next=/verify-phone");
  const next = safeNext(sp.next, homeFor(user.role));
  if (user.phoneVerified) redirect(next);
  return (
    <AuthShell title="Verify your phone" intro="We use your number for M-Pesa payments, receipts and important alerts. Enter the 6-digit code we send by SMS.">
      <VerifyPhoneForm phone={user.phone ? prettyPhone(user.phone) : ""} next={next} />
      <p className="mt-6 text-center text-sm text-ink-2">
        <Link href={next} className="link">
          Skip for now
        </Link>
      </p>
    </AuthShell>
  );
}
