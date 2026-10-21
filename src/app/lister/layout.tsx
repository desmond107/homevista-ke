import Link from "next/link";
import { BadgeCheck, Building2, CreditCard, Inbox, LayoutDashboard, ListChecks, Plus, Star, UserCog } from "lucide-react";
import { requireLister } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listerStatus } from "@/lib/lister-data";
import { KYC_LABELS } from "@/lib/constants";
import { DashShell } from "@/components/DashShell";
import { VerifiedBadge } from "@/components/ui";

export const metadata = { title: "Lister dashboard", robots: { index: false } };

export default async function ListerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireLister();
  const [st, unreadMsgs] = await Promise.all([listerStatus(user.listerId), prisma.message.count({ where: { listerId: user.listerId, readAt: null } })]);
  return (
    <DashShell
      title="Lister dashboard"
      subtitle={
        <span className="flex items-center gap-1.5">
          {st.lister.displayName} {st.lister.verified && <VerifiedBadge size="xs" label={false} />}
        </span>
      }
      nav={[
        { href: "/lister", label: "Overview", icon: <LayoutDashboard size={17} />, exact: true },
        { href: "/lister/listings", label: "My listings", icon: <ListChecks size={17} /> },
        { href: "/lister/subscription", label: "Subscription", icon: <CreditCard size={17} />, badge: st.subActive ? (st.daysLeft <= 5 ? `${st.daysLeft}d` : null) : "!" },
        { href: "/lister/kyc", label: "Verification (KYC)", icon: <BadgeCheck size={17} />, badge: st.kycApproved ? null : "!" },
        { href: "/lister/messages", label: "Messages", icon: <Inbox size={17} />, badge: unreadMsgs || null },
        { href: "/lister/reviews", label: "Reviews", icon: <Star size={17} /> },
        { href: "/lister/profile", label: "Public profile", icon: <Building2 size={17} /> },
        { href: "/account/profile", label: "Account & security", icon: <UserCog size={17} /> },
      ]}
      footer={
        <div className="space-y-3">
          <Link href="/lister/listings/new" className="btn-gold w-full">
            <Plus size={16} /> Add a listing
          </Link>
          <p className="text-center text-xs text-muted">KYC: {KYC_LABELS[st.lister.kycStatus]}</p>
        </div>
      }
    >
      {children}
    </DashShell>
  );
}
