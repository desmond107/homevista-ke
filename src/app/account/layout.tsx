import { Bell, CreditCard, Heart, KeyRound, LayoutDashboard, Search, Star, UserCog } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DashShell } from "@/components/DashShell";

export const metadata = { title: "My account", robots: { index: false } };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/account");
  const unread = await prisma.notification.count({ where: { userId: user.id, read: false } });
  return (
    <DashShell
      title="My account"
      subtitle={user.email}
      nav={[
        { href: "/account", label: "Overview", icon: <LayoutDashboard size={17} />, exact: true },
        { href: "/account/favourites", label: "Saved homes", icon: <Heart size={17} /> },
        { href: "/account/unlocked", label: "Unlocked properties", icon: <KeyRound size={17} /> },
        { href: "/account/payments", label: "Payment history", icon: <CreditCard size={17} /> },
        { href: "/account/reviews", label: "My reviews", icon: <Star size={17} /> },
        { href: "/account/searches", label: "Saved searches", icon: <Search size={17} /> },
        { href: "/account/notifications", label: "Notifications", icon: <Bell size={17} />, badge: unread || null },
        { href: "/account/profile", label: "Profile & security", icon: <UserCog size={17} /> },
      ]}
    >
      {children}
    </DashShell>
  );
}
