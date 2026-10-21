import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { BRAND } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { Logo } from "./Logo";
import { AdSlot } from "./AdSlot";

export async function Footer() {
  const counties = await prisma.county.findMany({ where: { popular: true }, orderBy: { name: "asc" }, take: 7, select: { name: true, slug: true } });
  const cols = [
    {
      title: "Explore",
      links: [
        ["/properties?purpose=for-sale", "Homes for sale"],
        ["/properties?purpose=for-rent", "Homes to rent"],
        ["/properties?purpose=short-stay", "Short stays"],
        ["/properties?purpose=off-plan", "Off-plan projects"],
        ["/properties?type=land-plots", "Land & plots"],
        ["/properties?type=commercial", "Commercial"],
      ],
    },
    { title: "Locations", links: counties.map((c) => [`/properties?county=${c.slug}`, `Property in ${c.name}`]) },
    {
      title: "Company",
      links: [
        ["/about", "About HomeVista"],
        ["/realtors", "Our realtors"],
        ["/companies", "Real estate companies"],
        ["/blog", "Insights & guides"],
        ["/faq", "FAQ"],
        ["/contact", "Contact us"],
      ],
    },
  ];

  return (
    <footer className="mt-24 bg-navy text-on-navy">
      <div className="container-x pt-14">
        <AdSlot placement="FOOTER" className="mb-14" />
      </div>
      <div className="container-x grid gap-12 pb-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo light />
          <p className="mt-4 max-w-xs font-serif text-lg text-gold italic">{BRAND.tagline}</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-on-navy/65">
            Kenya&apos;s premium property marketplace — verified listers, honest listings and secure M-Pesa payments, from Runda to Diani.
          </p>
          <ul className="mt-6 space-y-2.5 text-sm text-on-navy/75">
            <li className="flex gap-2.5">
              <MapPin size={16} className="mt-0.5 shrink-0 text-gold" /> {BRAND.address}
            </li>
            <li className="flex gap-2.5">
              <Phone size={16} className="mt-0.5 shrink-0 text-gold" /> {BRAND.phone}
            </li>
            <li className="flex gap-2.5">
              <Mail size={16} className="mt-0.5 shrink-0 text-gold" /> {BRAND.email}
            </li>
          </ul>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h3 className="mb-4 font-sans text-[11px] font-semibold tracking-[0.22em] text-gold uppercase">{c.title}</h3>
            <ul className="space-y-2.5">
              {c.links.map(([href, label]) => (
                <li key={href}>
                  <Link href={href!} className="text-sm text-on-navy/70 transition hover:text-on-navy">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col gap-3 py-6 text-xs text-on-navy/55 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} HomeVista Ke. All rights reserved.</p>
          <div className="flex gap-5">
            <Link href="/terms" className="hover:text-on-navy">
              Terms of use
            </Link>
            <Link href="/privacy" className="hover:text-on-navy">
              Privacy policy
            </Link>
            <Link href="/sitemap.xml" className="hover:text-on-navy">
              Sitemap
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
