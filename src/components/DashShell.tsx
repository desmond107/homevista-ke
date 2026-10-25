"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cx } from "./ui";

export type DashNavItem = { href: string; label: string; icon: ReactNode; badge?: number | string | null; exact?: boolean };

function NavBadge({ value, on }: { value: DashNavItem["badge"]; on: boolean }) {
  if (!value) return null;
  return <span className={cx("rounded-full px-1.5 text-[10px] font-bold", on ? "bg-gold text-[#0c1a2e]" : "bg-gold-soft text-gold-deep")}>{value}</span>;
}

/** Dashboard frame: sticky sidebar on desktop, a collapsible section menu on mobile and tablet. */
export function DashShell({ title, subtitle, nav, children, footer }: { title: string; subtitle?: ReactNode; nav: DashNavItem[]; children: ReactNode; footer?: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (n: DashNavItem) => (n.exact ? pathname === n.href : pathname === n.href || pathname.startsWith(n.href + "/"));
  const current = nav.find(active);
  const pending = nav.reduce((sum, n) => sum + (typeof n.badge === "number" ? n.badge : 0), 0);

  useEffect(() => setOpen(false), [pathname]);

  const link = (n: DashNavItem, compact = false) => (
    <Link
      key={n.href}
      href={n.href}
      aria-current={active(n) ? "page" : undefined}
      className={cx(
        "flex min-w-0 items-center gap-2.5 rounded-xl px-3 text-sm transition",
        compact ? "py-2.5" : "py-2",
        active(n) ? "bg-navy text-on-navy" : "text-ink-2 hover:bg-bg-alt hover:text-ink",
      )}
    >
      <span className={cx("shrink-0", active(n) ? "text-gold" : "text-gold-deep")}>{n.icon}</span>
      <span className="min-w-0 flex-1 truncate">{n.label}</span>
      <NavBadge value={n.badge} on={active(n)} />
    </Link>
  );

  return (
    <div className="container-x py-5 lg:py-10">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[260px_minmax(0,1fr)]">
        {/* Mobile / tablet: current section + collapsible menu */}
        <div className="min-w-0 lg:hidden">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="dash-menu"
            className="card flex w-full items-center gap-3 px-4 py-3 text-left"
          >
            <span className="shrink-0 text-gold-deep">{current?.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">{title}</span>
              <span className="block truncate text-sm font-medium text-ink">{current?.label ?? "Menu"}</span>
            </span>
            {!open && pending > 0 && <NavBadge value={pending} on={false} />}
            <ChevronDown size={18} className={cx("shrink-0 text-muted transition-transform", open && "rotate-180")} />
          </button>
          {open && (
            <nav id="dash-menu" aria-label={title} className="card mt-2 grid grid-cols-1 gap-1 p-2 min-[420px]:grid-cols-2 sm:grid-cols-3">
              {nav.map((n) => link(n, true))}
            </nav>
          )}
        </div>

        {/* Desktop: sticky sidebar that scrolls on its own when taller than the screen */}
        <aside className="hidden min-w-0 lg:sticky lg:top-24 lg:block lg:max-h-[calc(100dvh-7rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
          <div className="mb-4">
            <p className="font-serif text-2xl text-ink">{title}</p>
            {subtitle && <div className="mt-1 text-xs text-muted">{subtitle}</div>}
          </div>
          <nav aria-label={title} className="flex flex-col gap-0.5">
            {nav.map((n) => link(n))}
          </nav>
          {footer && <div className="mt-6">{footer}</div>}
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

export function DashHeader({ title, intro, action }: { title: ReactNode; intro?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl leading-tight break-words sm:text-3xl">{title}</h1>
        {intro && <p className="mt-1 text-sm text-ink-2">{intro}</p>}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}
