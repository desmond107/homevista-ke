import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { prettyPhone } from "@/lib/format";
import { DashHeader } from "@/components/DashShell";
import { ProfileForms } from "./ProfileForms";

export default async function ProfilePage() {
  const user = await requireUser("/account/profile");
  const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true, googleId: true, createdAt: true } });
  return (
    <>
      <DashHeader title="Profile & security" />
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card p-6">
          <h2 className="text-xl">Your details</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-muted">Email</dt><dd>{user.email}</dd></div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Phone</dt>
              <dd className="flex items-center gap-1.5">
                {user.phone ? prettyPhone(user.phone) : "—"}
                {user.phoneVerified ? <CheckCircle2 size={14} className="text-success" aria-label="verified" /> : <Link href="/verify-phone?next=/account/profile" className="link text-xs">Verify</Link>}
              </dd>
            </div>
            <div className="flex justify-between gap-3"><dt className="text-muted">Sign-in</dt><dd>{[row.passwordHash && "Password", row.googleId && "Google"].filter(Boolean).join(" + ")}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">Member since</dt><dd>{row.createdAt.getFullYear()}</dd></div>
          </dl>
        </section>
        <ProfileForms name={user.name} hasPassword={!!row.passwordHash} />
      </div>
    </>
  );
}
