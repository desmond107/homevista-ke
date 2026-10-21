import Link from "next/link";
import { cx } from "./ui";

/** Wordmark: a roofline-and-horizon "vista" mark with the serif name. */
export function LogoMark({ size = 34, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden>
      <rect x="1" y="1" width="38" height="38" rx="11" fill="var(--navy)" stroke="var(--gold)" strokeOpacity=".55" />
      <path d="M9 21.5 20 12l11 9.5" fill="none" stroke="var(--gold)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 19v9.5h14V19" fill="none" stroke="#f5efe3" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M8 31.5h24" stroke="var(--gold)" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="20" cy="23.4" r="2.3" fill="var(--gold)" />
    </svg>
  );
}

export function Logo({ light, className }: { light?: boolean; className?: string }) {
  return (
    <Link href="/" className={cx("group flex items-center gap-2.5", className)} aria-label="HomeVista Ke — home">
      <LogoMark />
      <span className={cx("font-serif text-[22px] leading-none tracking-tight", light ? "text-on-navy" : "text-ink")}>
        HomeVista <span className="text-gold-deep italic">Ke</span>
      </span>
    </Link>
  );
}
