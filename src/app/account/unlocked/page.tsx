import Image from "next/image";
import Link from "next/link";
import { KeyRound, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { areaLabel } from "@/lib/listings";
import { dateLabel, prettyPhone, priceLabel } from "@/lib/format";
import { DashHeader } from "@/components/DashShell";
import { EmptyState, VerifiedBadge } from "@/components/ui";

export default async function UnlockedPage() {
  const user = await requireUser("/account/unlocked");
  const unlocks = await prisma.unlock.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      payment: { select: { id: true, reference: true } },
      property: {
        select: {
          slug: true, title: true, price: true, pricePeriod: true, address: true, estate: true,
          county: { select: { name: true } }, town: { select: { name: true } },
          images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
          lister: { select: { displayName: true, verified: true, phone: true, whatsapp: true, email: true } },
        },
      },
    },
  });
  return (
    <>
      <DashHeader title="Unlocked properties" intro="Your unlocks never expire. Contact details and exact locations stay here permanently." />
      {unlocks.length ? (
        <ul className="space-y-4">
          {unlocks.map((u) => (
            <li key={u.id} className="card flex flex-col gap-4 p-4 sm:flex-row">
              <Link href={`/properties/${u.property.slug}`} className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-bg-alt sm:w-48">
                {u.property.images[0] && <Image src={u.property.images[0].url} alt="" fill sizes="200px" className="object-cover" />}
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/properties/${u.property.slug}`} className="font-serif text-xl text-ink hover:text-gold-deep">
                  {u.property.title}
                </Link>
                <p className="text-sm text-ink-2">{priceLabel(u.property.price, u.property.pricePeriod)}</p>
                <p className="mt-2 flex items-start gap-1.5 text-sm text-ink">
                  <MapPin size={15} className="mt-0.5 shrink-0 text-gold-deep" /> {u.property.address} — {areaLabel(u.property)}
                </p>
                <p className="mt-2 flex items-center gap-2 text-sm text-ink-2">
                  {u.property.lister.displayName} {u.property.lister.verified && <VerifiedBadge size="xs" label={false} />}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href={`tel:+${u.property.lister.phone}`} className="btn-primary btn-sm">
                    <Phone size={14} /> {prettyPhone(u.property.lister.phone)}
                  </a>
                  {u.property.lister.whatsapp && (
                    <a href={`https://wa.me/${u.property.lister.whatsapp}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm bg-[#25d366] text-white">
                      <MessageCircle size={14} /> WhatsApp
                    </a>
                  )}
                  <a href={`mailto:${u.property.lister.email}`} className="btn-outline btn-sm">
                    <Mail size={14} /> Email
                  </a>
                </div>
              </div>
              <div className="text-xs text-muted sm:text-right">
                <p>Unlocked {dateLabel(u.createdAt)}</p>
                {u.payment && (
                  <a href={`/api/payments/${u.payment.id}/receipt`} className="link mt-1 inline-block">
                    Receipt {u.payment.reference}
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<KeyRound size={24} />} title="No unlocked properties yet" body="When you unlock a property, its exact location and the lister's contacts are saved here forever." action={<Link href="/properties" className="btn-primary">Find a property</Link>} />
      )}
    </>
  );
}
