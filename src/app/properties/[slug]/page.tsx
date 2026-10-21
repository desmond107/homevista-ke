import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Bath, BedDouble, CalendarDays, CheckCircle2, FileCheck2, Lock, Mail, MapPin, Maximize2, MessageCircle, Phone, PlayCircle, Eye, Home as HomeIcon, Sofa, ShieldCheck,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { hasAdminPermission } from "@/lib/permissions";
import { areaLabel, cardSelect, publicWhere, recordView, savedSet } from "@/lib/listings";
import { getSettings } from "@/lib/settings";
import { rateLimit } from "@/lib/ratelimit";
import { clientIp, hashIp } from "@/lib/request";
import { appUrl } from "@/lib/notify";
import { LISTER_TYPE_LABELS, LISTING_STATUS_LABELS, PURPOSE_LABELS } from "@/lib/constants";
import { dateLabel, embedUrl, kes, priceLabel, prettyPhone, sizeLabel, timeAgo } from "@/lib/format";
import { Gallery } from "@/components/Gallery";
import { PayButton } from "@/components/PaymentModal";
import { FavouriteButton } from "@/components/FavouriteButton";
import { ShareButtons } from "@/components/ShareButtons";
import { PropertyCard } from "@/components/PropertyCard";
import { MapLoader } from "@/components/search/MapLoader";
import { DeleteReviewButton, ReportButton, ReviewForm } from "@/components/reviews";
import { ActionForm, SubmitButton } from "@/components/forms";
import { DynIcon } from "@/components/DynIcon";
import { AdSlot } from "@/components/AdSlot";
import { Avatar, Pill, Stars, VerifiedBadge } from "@/components/ui";
import { sendMessageAction } from "@/app/actions/user";
import { replyReviewAction } from "@/app/actions/lister";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  return prisma.property.findUnique({
    where: { slug },
    select: {
      ...cardSelect,
      description: true,
      status: true,
      statusNote: true,
      furnished: true,
      titleDeed: true,
      availableFrom: true,
      views: true,
      unlockCount: true,
      publishedAt: true,
      updatedAt: true,
      listerId: true,
      images: { orderBy: { sortOrder: "asc" }, select: { url: true, alt: true } },
      amenities: { orderBy: { sortOrder: "asc" }, select: { name: true, icon: true } },
      categories: { select: { name: true, slug: true } },
      county: { select: { name: true, slug: true } },
      town: { select: { name: true, slug: true } },
      type: { select: { name: true, slug: true } },
      lister: {
        select: {
          id: true, userId: true, displayName: true, slug: true, type: true, verified: true, logoUrl: true, createdAt: true, kycStatus: true, subscriptionEndsAt: true,
          user: { select: { avatarUrl: true, status: true } },
          _count: { select: { listings: { where: publicWhere() } } },
        },
      },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await load((await params).slug);
  if (!p) return { title: "Property not found" };
  const desc = `${PURPOSE_LABELS[p.purpose]} · ${priceLabel(p.price, p.pricePeriod)} · ${areaLabel(p)}. ${p.description.slice(0, 140)}`;
  return {
    title: `${p.title} — ${priceLabel(p.price, p.pricePeriod)}`,
    description: desc,
    alternates: { canonical: `/properties/${p.slug}` },
    openGraph: { title: p.title, description: desc, images: p.images[0] ? [{ url: p.images[0].url, width: 1600, height: 1200 }] : [], type: "website" },
  };
}

export default async function PropertyPage({ params }: Props) {
  const { slug } = await params;
  const [p, user, settings] = await Promise.all([load(slug), getUser(), getSettings()]);
  if (!p) notFound();

  const isOwner = !!user && user.id === p.lister.userId;
  const isAdmin = hasAdminPermission(user, "listings");
  const now = new Date();
  const isPublic = p.status === "ACTIVE" && p.lister.kycStatus === "APPROVED" && !!p.lister.subscriptionEndsAt && p.lister.subscriptionEndsAt > now && p.lister.user.status === "ACTIVE";
  if (!isPublic && !isOwner && !isAdmin) notFound();

  const unlock = user ? await prisma.unlock.findUnique({ where: { userId_propertyId: { userId: user.id, propertyId: p.id } } }) : null;
  const canSee = isOwner || isAdmin || !!unlock;

  // Locked fields are only fetched when the viewer is entitled to them — they never reach the browser otherwise.
  const secret = canSee
    ? await prisma.property.findUniqueOrThrow({
        where: { id: p.id },
        select: { address: true, lat: true, lng: true, lister: { select: { phone: true, whatsapp: true, email: true } } },
      })
    : null;

  // Count a view at most once per visitor per hour; owners don't inflate their own stats.
  if (isPublic && !isOwner) {
    const visitor = user?.id ?? hashIp(await clientIp());
    if ((await rateLimit(`view:${p.id}:${visitor}`, 1, 3600)).ok) await recordView(p.id);
  }

  const [reviews, breakdown, similar, myReview] = await Promise.all([
    prisma.review.findMany({
      where: { propertyId: p.id, status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { user: { select: { id: true, name: true, avatarUrl: true, unlocks: { where: { propertyId: p.id }, select: { id: true } } } } },
    }),
    prisma.review.groupBy({ by: ["rating"], where: { propertyId: p.id, status: "PUBLISHED" }, _count: true }),
    prisma.property.findMany({
      where: { ...publicWhere(), id: { not: p.id }, OR: [{ county: { slug: p.county.slug }, type: { slug: p.type.slug } }, { town: p.town ? { slug: p.town.slug } : undefined, purpose: p.purpose }] },
      select: cardSelect,
      orderBy: [{ lister: { verified: "desc" } }, { publishedAt: "desc" }],
      take: 3,
    }),
    user ? prisma.review.findUnique({ where: { propertyId_userId: { propertyId: p.id, userId: user.id } } }) : null,
  ]);
  const saved = await savedSet(user?.id, [p.id, ...similar.map((s) => s.id)]);
  const counts = Object.fromEntries(breakdown.map((b) => [b.rating, b._count]));
  const url = `${appUrl()}/properties/${p.slug}`;
  const embed = embedUrl(p.tourUrl) ?? embedUrl(p.videoUrl);
  const mediaLink = p.tourUrl ?? p.videoUrl;

  const facts = [
    p.bedrooms != null && { icon: <BedDouble size={18} />, label: "Bedrooms", value: p.bedrooms },
    p.bathrooms != null && { icon: <Bath size={18} />, label: "Bathrooms", value: p.bathrooms },
    p.size != null && { icon: <Maximize2 size={18} />, label: "Size", value: sizeLabel(p.size, p.sizeUnit) },
    { icon: <HomeIcon size={18} />, label: "Type", value: p.type.name },
    { icon: <Sofa size={18} />, label: "Furnishing", value: p.furnished ? "Furnished" : "Unfurnished" },
    p.titleDeed != null && { icon: <FileCheck2 size={18} />, label: "Title deed", value: p.titleDeed ? "Available" : "Not yet" },
    { icon: <CalendarDays size={18} />, label: "Available", value: p.availableFrom && p.availableFrom > now ? dateLabel(p.availableFrom) : "Now" },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; value: React.ReactNode }[];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: p.title,
    description: p.description.slice(0, 500),
    url,
    image: p.images.map((i) => i.url),
    datePosted: p.publishedAt?.toISOString(),
    offers: { "@type": "Offer", price: p.price, priceCurrency: "KES", availability: "https://schema.org/InStock", businessFunction: p.purpose === "RENT" || p.purpose === "SHORT_STAY" ? "http://purl.org/goodrelations/v1#LeaseOut" : "http://purl.org/goodrelations/v1#Sell" },
    itemOffered: {
      "@type": p.type.slug === "land-plots" ? "Landform" : "Accommodation",
      numberOfRooms: p.bedrooms ?? undefined,
      numberOfBathroomsTotal: p.bathrooms ?? undefined,
      floorSize: p.size ? { "@type": "QuantitativeValue", value: p.size, unitCode: p.sizeUnit === "SQM" ? "MTK" : p.sizeUnit === "ACRES" ? "ACR" : "FTK" } : undefined,
      address: { "@type": "PostalAddress", addressLocality: p.town?.name ?? p.county.name, addressRegion: p.county.name, addressCountry: "KE" },
    },
    ...(p.ratingCount > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: p.ratingAvg, reviewCount: p.ratingCount } } : {}),
  };

  return (
    <div className="container-x py-6 sm:py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      {!isPublic && (
        <div className="mb-5 rounded-2xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-warning">
          <strong>Not publicly visible</strong> — status: {LISTING_STATUS_LABELS[p.status]}
          {p.lister.kycStatus !== "APPROVED" && " · lister KYC not approved"}
          {(!p.lister.subscriptionEndsAt || p.lister.subscriptionEndsAt <= now) && " · lister subscription inactive"}
          {p.statusNote && ` · Note: ${p.statusNote}`}. Only you {isAdmin ? "(admin)" : ""} can see this page.
        </div>
      )}

      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap gap-1 text-xs text-muted">
        <Link href="/" className="hover:text-ink">Home</Link> /
        <Link href={`/properties?county=${p.county.slug}`} className="hover:text-ink">{p.county.name}</Link>
        {p.town && (
          <>
            {" "}/ <Link href={`/properties?county=${p.county.slug}&town=${p.town.slug}`} className="hover:text-ink">{p.town.name}</Link>
          </>
        )}
        / <span className="text-ink-2">{p.type.name}</span>
      </nav>

      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="mb-3 flex flex-wrap gap-2">
            <Pill tone="navy">{PURPOSE_LABELS[p.purpose]}</Pill>
            {p.featured && <Pill tone="gold">Featured</Pill>}
            {p.lister.verified && <VerifiedBadge />}
            {p.categories.map((c) => (
              <Link key={c.slug} href={`/properties?category=${c.slug}`} className="chip hover:border-gold">
                {c.name}
              </Link>
            ))}
          </div>
          <h1 className="text-3xl leading-tight sm:text-[40px]">{p.title}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-2">
            <MapPin size={15} className="text-gold-deep" /> {areaLabel(p)}
            {p.ratingCount > 0 && (
              <a href="#reviews" className="ml-3 inline-flex items-center gap-1.5 hover:text-ink">
                <Stars value={p.ratingAvg} size={14} /> {p.ratingAvg.toFixed(1)} · {p.ratingCount} reviews
              </a>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FavouriteButton propertyId={p.id} saved={saved.has(p.id)} signedIn={!!user} variant="button" />
          {isOwner && (
            <Link href={`/lister/listings/${p.id}/edit`} className="btn-primary">
              Edit listing
            </Link>
          )}
        </div>
      </div>

      <Gallery images={p.images} title={p.title} />

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-12">
          {/* Key facts */}
          <section aria-label="Key facts">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <p className="font-serif text-4xl text-ink">{priceLabel(p.price, p.pricePeriod)}</p>
              {p.purpose === "OFF_PLAN" && <span className="text-sm text-muted">starting price · payment plans available</span>}
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {facts.map((f) => (
                <div key={f.label} className="rounded-2xl border border-line bg-surface p-4">
                  <dt className="flex items-center gap-2 text-xs text-muted">
                    <span className="text-gold-deep">{f.icon}</span> {f.label}
                  </dt>
                  <dd className="mt-1.5 text-[15px] font-medium text-ink">{f.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="about-h">
            <h2 id="about-h" className="mb-4 text-2xl">About this property</h2>
            <div className="prose-hv max-w-none">
              {p.description.split(/\n{2,}/).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">
              Listed {p.publishedAt ? timeAgo(p.publishedAt) : "recently"} · Updated {timeAgo(p.updatedAt)} · <Eye size={12} className="inline" /> {p.views.toLocaleString()} views
            </p>
          </section>

          {p.amenities.length > 0 && (
            <section aria-labelledby="amen-h">
              <h2 id="amen-h" className="mb-4 text-2xl">Amenities</h2>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {p.amenities.map((a) => (
                  <li key={a.name} className="flex items-center gap-2.5 text-sm text-ink-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold-deep">
                      <DynIcon name={a.icon} size={16} />
                    </span>
                    {a.name}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {mediaLink && (
            <section aria-labelledby="media-h">
              <h2 id="media-h" className="mb-4 text-2xl">{p.tourUrl ? "Virtual tour" : "Video walkthrough"}</h2>
              {embed ? (
                <div className="aspect-video overflow-hidden rounded-[var(--radius-card)] border border-line bg-navy">
                  <iframe src={embed} title={`${p.title} — ${p.tourUrl ? "virtual tour" : "video"}`} className="h-full w-full" allow="fullscreen; xr-spatial-tracking; autoplay; encrypted-media" allowFullScreen loading="lazy" />
                </div>
              ) : (
                <a href={mediaLink} target="_blank" rel="noopener noreferrer nofollow" className="btn-outline">
                  <PlayCircle size={16} /> Open {p.tourUrl ? "virtual tour" : "video"}
                </a>
              )}
            </section>
          )}

          {/* Location */}
          <section aria-labelledby="loc-h">
            <h2 id="loc-h" className="mb-4 text-2xl">Location</h2>
            {secret?.lat != null && secret.lng != null ? (
              <>
                <p className="mb-3 flex items-start gap-2 text-sm text-ink">
                  <MapPin size={16} className="mt-0.5 shrink-0 text-gold-deep" /> <span><strong>{secret.address}</strong> — {areaLabel(p)}</span>
                </p>
                <MapLoader height={380} pins={[{ id: p.id, slug: p.slug, title: p.title, price: "Exact location", lat: secret.lat, lng: secret.lng, area: secret.address ?? "" }]} />
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${secret.lat},${secret.lng}`} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm mt-3">
                  Get directions in Google Maps
                </a>
              </>
            ) : (
              <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-line">
                <div className="h-[300px] bg-cover bg-center blur-[3px] grayscale-[30%]" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1400&q=60')" }} aria-hidden />
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-navy/55 p-6 text-center text-white">
                  <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gold text-[#0c1a2e]"><Lock size={20} /></span>
                  <p className="font-serif text-2xl">Exact location is locked</p>
                  <p className="mt-1 max-w-sm text-sm text-white/80">General area: {areaLabel(p)}. Unlock for {kes(settings.unlockPrice)} to see the map pin and full address.</p>
                </div>
              </div>
            )}
          </section>

          {/* Reviews */}
          <section id="reviews" aria-labelledby="rev-h" className="scroll-mt-24">
            <h2 id="rev-h" className="mb-5 text-2xl">Ratings & reviews</h2>
            <div className="grid gap-6 rounded-[var(--radius-card)] border border-line bg-surface p-6 sm:grid-cols-[180px_1fr]">
              <div className="text-center sm:border-r sm:border-line sm:pr-6">
                <p className="font-serif text-5xl text-ink">{p.ratingCount ? p.ratingAvg.toFixed(1) : "—"}</p>
                <Stars value={p.ratingAvg} size={16} className="mt-2" />
                <p className="mt-1 text-xs text-muted">{p.ratingCount} {p.ratingCount === 1 ? "review" : "reviews"}</p>
              </div>
              <ul className="space-y-1.5" aria-label="Rating breakdown">
                {[5, 4, 3, 2, 1].map((s) => {
                  const c = counts[s] ?? 0;
                  const pct = p.ratingCount ? (c / p.ratingCount) * 100 : 0;
                  return (
                    <li key={s} className="flex items-center gap-3 text-xs text-ink-2">
                      <span className="w-6 text-right">{s}★</span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-bg-alt">
                        <span className="block h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
                      </span>
                      <span className="w-8 text-muted">{c}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="mt-6">
              {!user ? (
                <p className="text-sm text-ink-2">
                  <Link href={`/login?next=/properties/${p.slug}%23reviews`} className="link">Sign in</Link> to rate and review this property.
                </p>
              ) : !isOwner ? (
                <ReviewForm propertyId={p.id} existing={myReview ? { rating: myReview.rating, comment: myReview.comment } : null} />
              ) : null}
              {myReview && myReview.status === "PENDING" && <p className="mt-2 text-xs text-warning">Your review is awaiting moderation.</p>}
            </div>

            <ul className="mt-8 divide-y divide-line">
              {reviews.map((r) => (
                <li key={r.id} className="py-6">
                  <div className="flex items-start gap-3">
                    <Avatar name={r.user.name} src={r.user.avatarUrl} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-sm font-semibold text-ink">{r.user.name}</span>
                        {r.user.unlocks.length > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success" title="Unlocked this property's contact details">
                            <ShieldCheck size={11} /> Verified Viewer
                          </span>
                        )}
                        <span className="text-xs text-muted">· {timeAgo(r.createdAt)}</span>
                      </div>
                      <Stars value={r.rating} size={13} className="mt-1" />
                      <p className="mt-2 text-sm leading-relaxed text-ink-2">{r.comment}</p>
                      {r.reply && (
                        <div className="mt-3 rounded-xl border-l-2 border-gold bg-bg-alt px-4 py-3">
                          <p className="text-xs font-semibold text-ink">Response from {p.lister.displayName}</p>
                          <p className="mt-1 text-sm text-ink-2">{r.reply}</p>
                        </div>
                      )}
                      {isOwner && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-xs text-gold-deep">{r.reply ? "Edit reply" : "Reply"}</summary>
                          <ActionForm action={replyReviewAction} className="mt-2 space-y-2">
                            <input type="hidden" name="reviewId" value={r.id} />
                            <textarea name="reply" rows={2} maxLength={1000} defaultValue={r.reply ?? ""} className="input" placeholder="Write a public reply…" />
                            <SubmitButton className="btn-primary btn-sm">Post reply</SubmitButton>
                          </ActionForm>
                        </details>
                      )}
                      <div className="mt-2 flex gap-4">
                        {user?.id === r.user.id ? <DeleteReviewButton reviewId={r.id} /> : <ReportButton reviewId={r.id} signedIn={!!user} />}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
              {!reviews.length && <li className="py-6 text-sm text-muted">No reviews yet — be the first to share your experience.</li>}
            </ul>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="card overflow-hidden">
            <div className="flex items-center gap-3 border-b border-line p-5">
              <Avatar name={p.lister.displayName} src={p.lister.logoUrl ?? p.lister.user.avatarUrl} size={52} />
              <div className="min-w-0">
                <Link href={`/listers/${p.lister.slug}`} className="flex items-center gap-1.5 font-serif text-lg text-ink hover:text-gold-deep">
                  <span className="truncate">{p.lister.displayName}</span>
                  {p.lister.verified && <VerifiedBadge size="xs" label={false} />}
                </Link>
                <p className="text-xs text-muted">
                  {LISTER_TYPE_LABELS[p.lister.type]} · {p.lister._count.listings} listings · since {p.lister.createdAt.getFullYear()}
                </p>
              </div>
            </div>
            <div className="p-5">
              {secret ? (
                <div className="space-y-3">
                  {unlock && (
                    <p className="flex items-center gap-2 text-sm text-success">
                      <CheckCircle2 size={16} /> Unlocked {timeAgo(unlock.createdAt)}
                    </p>
                  )}
                  <a href={`tel:+${secret.lister.phone}`} className="btn-primary w-full">
                    <Phone size={16} /> Call {prettyPhone(secret.lister.phone)}
                  </a>
                  {secret.lister.whatsapp && (
                    <a
                      href={`https://wa.me/${secret.lister.whatsapp}?text=${encodeURIComponent(`Hello, I'm interested in "${p.title}" on HomeVista Ke: ${url}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn w-full bg-[#25d366] text-white hover:brightness-95"
                    >
                      <MessageCircle size={16} /> WhatsApp
                    </a>
                  )}
                  <a href={`mailto:${secret.lister.email}?subject=${encodeURIComponent(`Enquiry: ${p.title}`)}`} className="btn-outline w-full">
                    <Mail size={16} /> {secret.lister.email}
                  </a>
                  {unlock && (
                    <details className="pt-2">
                      <summary className="cursor-pointer text-sm text-gold-deep">Send a message to the lister</summary>
                      <ActionForm action={sendMessageAction} className="mt-3 space-y-2" resetOnSuccess>
                        <input type="hidden" name="propertyId" value={p.id} />
                        <textarea name="body" rows={3} maxLength={2000} required className="input" placeholder="Hi, I'd like to view this property on…" />
                        <SubmitButton className="btn-primary btn-sm w-full">Send message</SubmitButton>
                      </ActionForm>
                    </details>
                  )}
                </div>
              ) : (
                <div>
                  <ul className="mb-5 space-y-2.5 text-sm text-ink-2">
                    {["Exact address & map pin", "Phone number & call button", "WhatsApp chat", "Email & direct messaging"].map((t) => (
                      <li key={t} className="flex items-center gap-2.5">
                        <Lock size={14} className="text-gold-deep" /> {t}
                      </li>
                    ))}
                  </ul>
                  {user ? (
                    <PayButton
                      kind="UNLOCK"
                      propertyId={p.id}
                      amount={settings.unlockPrice}
                      defaultPhone={user.phone}
                      title="Unlock this property"
                      subtitle={`Reveal the exact location and ${p.lister.displayName}'s contact details for "${p.title}". One-off payment — yours forever.`}
                      label={<><Lock size={16} /> Pay {kes(settings.unlockPrice)} to unlock</>}
                    />
                  ) : (
                    <Link href={`/login?next=/properties/${p.slug}`} className="btn-gold w-full">
                      <Lock size={16} /> Sign in to unlock — {kes(settings.unlockPrice)}
                    </Link>
                  )}
                  <p className="mt-3 text-center text-xs text-muted">One-time M-Pesa payment · Permanent access · Receipt by email & SMS</p>
                </div>
              )}
            </div>
          </div>

          <div className="card p-5">
            <p className="mb-3 text-xs font-semibold tracking-wider text-muted uppercase">Share this property</p>
            <ShareButtons url={url} title={p.title} />
            <div className="mt-4 border-t border-line pt-3">
              <ReportButton propertyId={p.id} signedIn={!!user} label="Report this listing" />
            </div>
          </div>

          <AdSlot placement="SIDEBAR" variant="tall" />
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-20" aria-labelledby="similar-h">
          <h2 id="similar-h" className="mb-6 text-3xl">Similar properties</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((s) => (
              <PropertyCard key={s.id} p={s} saved={saved.has(s.id)} signedIn={!!user} />
            ))}
          </div>
        </section>
      )}

      {/* Mobile sticky CTA */}
      {!secret && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
          <div>
            <p className="font-serif text-lg leading-none">{priceLabel(p.price, p.pricePeriod)}</p>
            <p className="text-xs text-muted">Unlock contacts · {kes(settings.unlockPrice)}</p>
          </div>
          {user ? (
            <PayButton
              kind="UNLOCK"
              propertyId={p.id}
              amount={settings.unlockPrice}
              defaultPhone={user.phone}
              title="Unlock this property"
              subtitle={`Reveal the exact location and contacts for "${p.title}".`}
              label={<><Lock size={15} /> Unlock</>}
              className="btn-gold"
            />
          ) : (
            <Link href={`/login?next=/properties/${p.slug}`} className="btn-gold">
              <Lock size={15} /> Unlock
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
