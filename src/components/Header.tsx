import Link from "next/link";
import { Bell, Heart, LayoutDashboard, LogOut, Plus, ShieldCheck, User as UserIcon } from "lucide-react";
import { getUser, homeFor } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logoutAction } from "@/app/actions/auth";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { MobileMenu } from "./MobileMenu";
import { Avatar } from "./ui";

export const NAV = [
  { href: "/properties?purpose=for-sale", label: "Buy" },
  { href: "/properties?purpose=for-rent", label: "Rent" },
  { href: "/properties?purpose=short-stay", label: "Short Stay" },
  { href: "/properties?purpose=off-plan", label: "Off-Plan" },
  { href: "/realtors", label: "Realtors" },
  { href: "/companies", label: "Companies" },
  { href: "/blog", label: "Insights" },
];

export async function Header() {
  const user = await getUser();
  const unread = user ? await prisma.notification.count({ where: { userId: user.id, read: false } }) : 0;
  const dash = user ? homeFor(user.role) : "/login";
  const notifHref = "/account/notifications";

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/85 backdrop-blur-xl supports-[backdrop-filter]:bg-bg/70">
      <div className="container-x flex h-[68px] items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-full px-3.5 py-2 text-sm text-ink-2 transition hover:bg-bg-alt hover:text-ink">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          <ThemeToggle className="hidden sm:inline-flex" />
          {user ? (
            <>
              <Link href={notifHref} className="btn-ghost relative h-10 w-10 !p-0" aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}>
                <Bell size={18} />
                {unread > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-[#0c1a2e]">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
              <details className="group relative hidden sm:block">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-line bg-surface py-1 pr-3 pl-1 text-sm hover:border-gold [&::-webkit-details-marker]:hidden">
                  <Avatar name={user.name} src={user.avatarUrl} size={30} />
                  <span className="max-w-28 truncate text-ink">{user.name.split(" ")[0]}</span>
                </summary>
                <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-lift">
                  <p className="truncate px-3 pt-2 pb-1 text-xs text-muted">{user.email}</p>
                  <MenuLink href={dash} icon={<LayoutDashboard size={16} />}>
                    {user.role === "ADMIN" ? "Admin panel" : user.role === "LISTER" ? "Lister dashboard" : "My account"}
                  </MenuLink>
                  {user.role === "LISTER" && (
                    <MenuLink href="/lister/listings/new" icon={<Plus size={16} />}>
                      Add a listing
                    </MenuLink>
                  )}
                  <MenuLink href="/account/favourites" icon={<Heart size={16} />}>
                    Saved homes
                  </MenuLink>
                  <MenuLink href="/account/profile" icon={<UserIcon size={16} />}>
                    Profile & security
                  </MenuLink>
                  {user.role === "ADMIN" && (
                    <MenuLink href="/admin" icon={<ShieldCheck size={16} />}>
                      Moderation
                    </MenuLink>
                  )}
                  <form action={logoutAction} className="border-t border-line mt-1 pt-1">
                    <button className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-ink-2 hover:bg-bg-alt hover:text-ink">
                      <LogOut size={16} /> Sign out
                    </button>
                  </form>
                </div>
              </details>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost hidden sm:inline-flex">
                Sign in
              </Link>
              <Link href="/register?as=lister" className="btn-primary hidden sm:inline-flex">
                List a property
              </Link>
            </>
          )}
          <MobileMenu nav={NAV} user={user ? { name: user.name, role: user.role, dash } : null} />
        </div>
      </div>
    </header>
  );
}

function MenuLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-ink-2 hover:bg-bg-alt hover:text-ink">
      <span className="text-gold-deep">{icon}</span>
      {children}
    </Link>
  );
}
