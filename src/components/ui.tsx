import Link from "next/link";
import type { ReactNode } from "react";
import { BadgeCheck, Star } from "lucide-react";
import { initials } from "@/lib/format";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

/** The gold "Verified" badge shown on verified listers everywhere. */
export function VerifiedBadge({ size = "sm", label = true }: { size?: "xs" | "sm" | "md"; label?: boolean }) {
  const icon = size === "md" ? 18 : size === "sm" ? 15 : 13;
  return (
    <span
      title="Verified lister — identity and documents checked by HomeVista Ke"
      className={cx(
        "inline-flex items-center gap-1 rounded-full font-semibold text-gold-deep",
        label && "bg-gold-soft px-2 py-0.5 ring-1 ring-gold/40",
        size === "md" ? "text-xs" : "text-[11px]",
      )}
    >
      <BadgeCheck size={icon} className="fill-gold text-surface" strokeWidth={2.2} aria-hidden />
      {label && "Verified"}
    </span>
  );
}

export function Stars({ value, size = 14, className }: { value: number; size?: number; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-0.5", className)} aria-label={`${value.toFixed(1)} out of 5 stars`} role="img">
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - (i - 1)));
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star size={size} className="absolute inset-0 text-line-strong" fill="currentColor" strokeWidth={0} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star size={size} className="text-gold" fill="currentColor" strokeWidth={0} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

export function Avatar({ name, src, size = 40, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  if (src)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} width={size} height={size} loading="lazy" className={cx("shrink-0 rounded-full object-cover", className)} style={{ width: size, height: size }} />;
  return (
    <span
      aria-hidden
      className={cx("inline-flex shrink-0 items-center justify-center rounded-full bg-navy font-serif text-gold", className)}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </span>
  );
}

export function SectionHeading({ eyebrow, title, intro, action, center }: { eyebrow?: string; title: ReactNode; intro?: ReactNode; action?: ReactNode; center?: boolean }) {
  return (
    <div className={cx("mb-8 flex flex-col gap-4 sm:mb-10", center ? "items-center text-center" : "sm:flex-row sm:items-end sm:justify-between")}>
      <div className={cx(center && "max-w-2xl")}>
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h2 className="text-3xl leading-tight text-ink sm:text-4xl">{title}</h2>
        {intro && <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-2">{intro}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ eyebrow, title, intro, children }: { eyebrow?: string; title: ReactNode; intro?: ReactNode; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-navy text-on-navy">
      <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, var(--gold) 0, transparent 40%), radial-gradient(circle at 80% 60%, var(--gold) 0, transparent 35%)" }} />
      <div className="container-x relative py-14 sm:py-20">
        {eyebrow && <p className="mb-3 text-[11px] font-semibold tracking-[0.22em] text-gold uppercase">{eyebrow}</p>}
        <h1 className="max-w-3xl text-4xl leading-tight sm:text-5xl">{title}</h1>
        {intro && <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-on-navy/75">{intro}</p>}
        {children}
      </div>
    </section>
  );
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface-2 px-6 py-14 text-center">
      {icon && <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gold-soft text-gold-deep">{icon}</div>}
      <h3 className="text-xl text-ink">{title}</h3>
      {body && <p className="mt-2 max-w-md text-sm text-ink-2">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

const TONES = {
  neutral: "bg-bg-alt text-ink-2 ring-line",
  gold: "bg-gold-soft text-gold-deep ring-gold/40",
  success: "bg-success-soft text-success ring-success/30",
  danger: "bg-danger-soft text-danger ring-danger/30",
  warning: "bg-warning-soft text-warning ring-warning/30",
  navy: "bg-navy text-on-navy ring-navy",
} as const;

export type Tone = keyof typeof TONES;

export function Pill({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 whitespace-nowrap", TONES[tone], className)}>{children}</span>;
}

export function statusTone(status: string): Tone {
  if (["ACTIVE", "SUCCESS", "APPROVED", "PUBLISHED", "RESOLVED"].includes(status)) return "success";
  if (["PENDING", "UNDER_REVIEW", "OPEN", "PAUSED", "DRAFT"].includes(status)) return "warning";
  if (["REJECTED", "FAILED", "BANNED", "REMOVED", "HIDDEN"].includes(status)) return "danger";
  if (["RESUBMIT", "SUSPENDED", "TIMEOUT", "CANCELLED"].includes(status)) return "gold";
  return "neutral";
}

export function StatCard({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-muted uppercase">{label}</p>
        {icon && <span className="text-gold-deep">{icon}</span>}
      </div>
      <p className="mt-2 font-serif text-3xl text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Pagination({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  const nums = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const list = [...nums].sort((a, b) => a - b);
  return (
    <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 && (
        <Link href={href(page - 1)} className="btn-outline btn-sm" rel="prev">
          ← Previous
        </Link>
      )}
      {list.map((n, i) => (
        <span key={n} className="flex items-center gap-1.5">
          {i > 0 && list[i - 1]! < n - 1 && <span className="px-1 text-muted">…</span>}
          <Link
            href={href(n)}
            aria-current={n === page ? "page" : undefined}
            className={cx("flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm", n === page ? "bg-navy text-on-navy" : "text-ink-2 hover:bg-bg-alt")}
          >
            {n}
          </Link>
        </span>
      ))}
      {page < pages && (
        <Link href={href(page + 1)} className="btn-outline btn-sm" rel="next">
          Next →
        </Link>
      )}
    </nav>
  );
}

/** Monogram logo for companies without an uploaded logo. */
export function Monogram({ name, size = 56, className }: { name: string; size?: number; className?: string }) {
  return (
    <span
      className={cx("inline-flex shrink-0 items-center justify-center rounded-2xl border border-gold/40 bg-navy font-serif text-gold", className)}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
