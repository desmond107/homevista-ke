import Image from "next/image";
import type { ReactNode } from "react";
import { BRAND } from "@/lib/constants";

export function AuthShell({ title, intro, children, image = "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=80" }: { title: string; intro?: ReactNode; children: ReactNode; image?: string }) {
  return (
    <div className="container-x grid min-h-[calc(100dvh-68px)] items-stretch gap-10 py-10 lg:grid-cols-2 lg:py-14">
      <div className="relative hidden overflow-hidden rounded-[2rem] bg-navy lg:block">
        <Image src={image} alt="" fill sizes="50vw" className="object-cover opacity-70" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-10">
          <p className="font-serif text-4xl leading-tight text-white">
            {BRAND.tagline.split(". ")[0]}.
            <br />
            <span className="text-gold italic">{BRAND.tagline.split(". ")[1]}</span>
          </p>
          <p className="mt-3 max-w-sm text-sm text-white/75">Verified listers. Real photos. Secure M-Pesa payments. Kenya&apos;s premium property marketplace.</p>
        </div>
      </div>
      <div className="flex items-center justify-center">
        <div className="w-full max-w-md">
          <h1 className="text-4xl">{title}</h1>
          {intro && <p className="mt-2 text-sm text-ink-2">{intro}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function GoogleButton({ href }: { href: string }) {
  return (
    <a href={href} className="btn-outline w-full !py-3">
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
      </svg>
      Continue with Google
    </a>
  );
}

export function Divider({ label = "or" }: { label?: string }) {
  return (
    <div className="my-6 flex items-center gap-3 text-xs text-muted">
      <span className="h-px flex-1 bg-line" />
      {label}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
