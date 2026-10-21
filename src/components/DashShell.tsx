"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cx } from "./ui";

export type DashNavItem = { href: string; label: string; icon: ReactNode; badge?: number | string | null; exact?: boolean };

/** Dashboard frame: sticky sidebar on desktop, horizontal scroll tabs on mobile. */
export function DashShell({ title, subtitle, nav, children, footer }: { title: string; subtitle?: ReactNode; nav: DashNavItem[]; children: ReactNode; footer?: ReactNode }) {
  const pathname = usePathname();
  const active = (n: DashNavItem) => (n.exact ? pathname === n.href : pathname === n.href || pathname.startsWith(n.href + "/"));
  return (
    <div className="container-x py-6 lg:py-10">
      <div className="grid gap-8 lg:grid-cols-[250px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="mb-4 hidden lg:block">
            <p className="font-serif text-2xl text-ink">{title}</p>
            {subtitle && <div className="mt-1 text-xs text-muted">{subtitle}</div>}
          </div>
          <nav aria-label={title} className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active(n) ? "page" : undefined}
                className={cx(
                  "flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm whitespace-nowrap transition",
                  active(n) ? "bg-navy text-on-navy" : "text-ink-2 hover:bg-bg-alt hover:text-ink",
                )}
              >
                <span className={cx(active(n) ? "text-gold" : "text-gold-deep")}>{n.icon}</span>
                <span className="flex-1">{n.label}</span>
                {n.badge ? <span className={cx("rounded-full px-1.5 text-[10px] font-bold", active(n) ? "bg-gold text-[#0c1a2e]" : "bg-gold-soft text-gold-deep")}>{n.badge}</span> : null}
              </Link>
            ))}
          </nav>
          {footer && <div className="mt-6 hidden lg:block">{footer}</div>}
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

export function DashHeader({ title, intro, action }: { title: ReactNode; intro?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl leading-tight">{title}</h1>
        {intro && <p className="mt-1 text-sm text-ink-2">{intro}</p>}
      </div>
      {action}
    </div>
  );
}
