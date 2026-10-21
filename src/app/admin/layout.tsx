import { BadgeCheck, BarChart3, Building2, CreditCard, FileText, Flag, History, Home, Megaphone, Settings, ShieldCheck, Star, Tags, UserCog, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasAdminPermission, type AdminPermission } from "@/lib/permissions";
import { DashShell, type DashNavItem } from "@/components/DashShell";

export const metadata = { title: "Admin", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/admin");
  if (user.role !== "ADMIN") redirect("/");
  const [kycQueue, pendingListings, openReports, flaggedReviews] = await Promise.all([
    prisma.kycSubmission.count({ where: { status: { in: ["PENDING", "UNDER_REVIEW"] } } }),
    prisma.property.count({ where: { status: "PENDING" } }),
    prisma.report.count({ where: { status: "OPEN" } }),
    prisma.review.count({ where: { OR: [{ flagged: true }, { status: "PENDING" }] } }),
  ]);
  const items: (DashNavItem & { perm: AdminPermission })[] = [
    { href: "/admin", label: "Analytics", icon: <BarChart3 size={17} />, exact: true, perm: "analytics" },
    { href: "/admin/kyc", label: "KYC reviews", icon: <BadgeCheck size={17} />, badge: kycQueue || null, perm: "kyc" },
    { href: "/admin/listings", label: "Listings", icon: <Home size={17} />, badge: pendingListings || null, perm: "listings" },
    { href: "/admin/reports", label: "Reports", icon: <Flag size={17} />, badge: openReports || null, perm: "listings" },
    { href: "/admin/reviews", label: "Reviews", icon: <Star size={17} />, badge: flaggedReviews || null, perm: "reviews" },
    { href: "/admin/users", label: "Users & listers", icon: <Users size={17} />, perm: "users" },
    { href: "/admin/payments", label: "Payments", icon: <CreditCard size={17} />, perm: "payments" },
    { href: "/admin/adverts", label: "Ads & adverts", icon: <Megaphone size={17} />, perm: "adverts" },
    { href: "/admin/companies", label: "Companies", icon: <Building2 size={17} />, perm: "directory" },
    { href: "/admin/realtors", label: "Realtors", icon: <ShieldCheck size={17} />, perm: "directory" },
    { href: "/admin/taxonomy", label: "Types & locations", icon: <Tags size={17} />, perm: "taxonomy" },
    { href: "/admin/content", label: "Content", icon: <FileText size={17} />, perm: "content" },
    { href: "/admin/settings", label: "Settings", icon: <Settings size={17} />, perm: "settings" },
    { href: "/admin/staff", label: "Staff admins", icon: <UserCog size={17} />, perm: "staff" },
    { href: "/admin/activity", label: "Audit log", icon: <History size={17} />, perm: "settings" },
  ];
  return (
    <DashShell
      title="Admin panel"
      subtitle={user.isSuperAdmin ? "Super admin" : "Staff admin"}
      nav={items.filter((i) => hasAdminPermission(user, i.perm)).map(({ perm: _p, ...i }) => i)}
    >
      {children}
    </DashShell>
  );
}
