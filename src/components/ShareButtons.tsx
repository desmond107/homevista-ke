"use client";

import { useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent;
  const links = [
    { label: "WhatsApp", href: `https://wa.me/?text=${enc(`${title} — ${url}`)}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
    { label: "X", href: `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}` },
    { label: "Email", href: `mailto:?subject=${enc(title)}&body=${enc(url)}` },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="btn-outline btn-sm"
        onClick={async () => {
          if (navigator.share) {
            try {
              await navigator.share({ title, url });
              return;
            } catch {}
          }
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? <Check size={14} /> : <Share2 size={14} />} {copied ? "Link copied" : "Share"}
      </button>
      {links.map((l) => (
        <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm">
          {l.label}
        </a>
      ))}
      <button
        type="button"
        className="btn-ghost btn-sm"
        aria-label="Copy link"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        <Link2 size={14} />
      </button>
    </div>
  );
}
