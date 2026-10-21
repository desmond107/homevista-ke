// Client-safe formatting helpers.
import { PERIOD_LABELS, SIZE_UNIT_LABELS } from "./constants";

const kesFmt = new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 });

export function kes(n: number | null | undefined) {
  return n == null ? "—" : `KSh ${kesFmt.format(n)}`;
}

/** Compact price for cards and pins: KSh 45K, KSh 12.5M. */
export function kesCompact(n: number) {
  if (n >= 1_000_000) return `KSh ${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `KSh ${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return `KSh ${n}`;
}

export function priceLabel(price: number, period: string) {
  const p = PERIOD_LABELS[period] ?? "";
  return p ? `${kes(price)} ${p}` : kes(price);
}

export function sizeLabel(size: number | null | undefined, unit: string) {
  if (!size) return null;
  const label = unit === "ACRES" && size === 1 ? "acre" : (SIZE_UNIT_LABELS[unit] ?? unit);
  return `${kesFmt.format(size)} ${label}`;
}

export function slugify(s: string, max = 60) {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, max)
    .replace(/-$/, "");
}

export function timeAgo(d: Date | string) {
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 86400 * 30) return `${Math.round(s / 86400)} d ago`;
  return dateLabel(d);
}

export function dateLabel(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Nairobi" });
}

export function dateTimeLabel(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Nairobi",
  });
}

/**
 * Normalises a Kenyan mobile number to 2547XXXXXXXX / 2541XXXXXXXX (the format Daraja expects).
 * Returns null when it isn't a valid Kenyan mobile number.
 */
export function normalizeKePhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "").replace(/^\+/, "");
  let n = digits;
  if (/^0[17]\d{8}$/.test(n)) n = "254" + n.slice(1);
  else if (/^[17]\d{8}$/.test(n)) n = "254" + n;
  return /^254[17]\d{8}$/.test(n) ? n : null;
}

/** 254712345678 → +254 712 345 678 */
export function prettyPhone(p: string | null | undefined) {
  if (!p) return "";
  const m = p.match(/^254(\d{3})(\d{3})(\d{3})$/);
  return m ? `+254 ${m[1]} ${m[2]} ${m[3]}` : p;
}

/** 254712345678 → 2547•••••678 for receipts and lists. */
export function maskPhone(p: string) {
  return p.length > 7 ? p.slice(0, 4) + "•".repeat(p.length - 7) + p.slice(-3) : p;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function plural(n: number, one: string, many = one + "s") {
  return `${n.toLocaleString("en-KE")} ${n === 1 ? one : many}`;
}

/** Converts a video / virtual-tour link into an embeddable URL for allow-listed providers (see CSP frame-src). */
export function embedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = u.searchParams.get("v") ?? u.pathname.match(/^\/(?:shorts|embed)\/([\w-]{6,})/)?.[1];
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (host === "youtu.be") return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`;
    if (host === "vimeo.com") {
      const id = u.pathname.match(/^\/(\d+)/)?.[1];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    if (host === "my.matterport.com" || host === "kuula.co") return u.toString();
    return null;
  } catch {
    return null;
  }
}
