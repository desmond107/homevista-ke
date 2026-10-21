"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function MobileMenu({ nav, user }: { nav: { href: string; label: string }[]; user: { name: string; role: string; dash: string } | null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button type="button" className="btn-ghost h-10 w-10 !p-0 lg:hidden" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
        <Menu size={20} />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="animate-rise absolute top-0 right-0 flex h-full w-[86%] max-w-sm flex-col bg-bg shadow-lift">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <span className="font-serif text-xl">Menu</span>
              <div className="flex items-center gap-1">
                <ThemeToggle />
                <button type="button" className="btn-ghost h-10 w-10 !p-0" aria-label="Close menu" onClick={() => setOpen(false)}>
                  <X size={20} />
                </button>
              </div>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className="block rounded-xl px-3 py-3 text-[15px] text-ink hover:bg-bg-alt">
                  {n.label}
                </Link>
              ))}
              <div className="my-3 border-t border-line" />
              {[
                ["/about", "About us"],
                ["/faq", "FAQ"],
                ["/contact", "Contact"],
              ].map(([h, l]) => (
                <Link key={h} href={h!} className="block rounded-xl px-3 py-2.5 text-sm text-ink-2 hover:bg-bg-alt">
                  {l}
                </Link>
              ))}
            </nav>
            <div className="space-y-2 border-t border-line p-5">
              {user ? (
                <Link href={user.dash} className="btn-primary w-full">
                  {user.role === "ADMIN" ? "Admin panel" : user.role === "LISTER" ? "Lister dashboard" : "My account"}
                </Link>
              ) : (
                <>
                  <Link href="/register?as=lister" className="btn-primary w-full">
                    List a property
                  </Link>
                  <Link href="/login" className="btn-outline w-full">
                    Sign in
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
