/*
 * Seeds HomeVista Ke with realistic Kenyan sample data.
 *   npm run db:seed            — wipes and reseeds (development only)
 *
 * Dev logins (password for all: HomeVista-dev-2026)
 *   admin@homevista.co.ke      super admin
 *   moderator@homevista.co.ke  staff admin (KYC, listings, reviews)
 *   grace@vistaprime.co.ke     verified lister (company)
 *   lucy.njeri@gmail.com       lister with an EXPIRED subscription (listings hidden)
 *   faith@lakesidehomes.co.ke  lister whose subscription expires in 2 days
 *   kevin.mutua@gmail.com      lister with KYC pending (listings hidden)
 *   wanjiku@example.com        property seeker with unlocks, favourites and reviews
 */
import { PrismaClient, type Purpose } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import path from "path";
import { promises as fs } from "fs";
import sharp from "sharp";
import {
  AMENITIES, BLOG, CATEGORIES, COMPANIES, COUNTIES, FAQS, LISTERS, PAGES, PROPERTIES, REALTORS, REPLIES, REVIEW_TEXTS,
  TESTIMONIALS, TYPES, VIEWER_NAMES, img, PH,
} from "./seed-data";

const prisma = new PrismaClient();
const DAY = 86400_000;
const now = Date.now();

// Deterministic PRNG so every seed run produces the same data.
let seed = 20261021;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const pick = <T,>(a: readonly T[]) => a[Math.floor(rand() * a.length)]!;
const int = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
const daysAgo = (d: number) => new Date(now - d * DAY - int(0, 86399) * 1000);

const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60).replace(/-$/, "");
const ref = () => "HV-" + crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 7);
const receipt = () => "S" + crypto.randomBytes(5).toString("hex").toUpperCase().slice(0, 9);

function approximate(lat: number, lng: number, s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const angle = (h % 360) * (Math.PI / 180);
  const dist = 0.004 + ((h >> 9) % 500) / 100000;
  return { approxLat: lat + Math.sin(angle) * dist, approxLng: lng + Math.cos(angle) * dist };
}

async function wipe() {
  // Order matters for FKs; TRUNCATE ... CASCADE keeps it simple.
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`);
}

async function main() {
  if (process.env.NODE_ENV === "production" && !process.argv.includes("--force")) throw new Error("Refusing to wipe a production database. Pass --force if you really mean it.");
  console.log("Wiping…");
  await wipe();
  const pw = await bcrypt.hash("HomeVista-dev-2026", 12);

  // ── Settings
  await prisma.setting.createMany({ data: [
    { key: "unlock_price", value: "250" },
    { key: "subscription_price", value: "1000" },
    { key: "subscription_days", value: "30" },
  ] });

  // ── Taxonomy
  const types = new Map<string, string>();
  for (const [i, [name, icon]] of TYPES.entries()) {
    const t = await prisma.propertyType.create({ data: { name, slug: slugify(name), icon, sortOrder: i } });
    types.set(name, t.id);
  }
  const amenities = new Map<string, string>();
  for (const [i, [name, icon]] of AMENITIES.entries()) {
    const a = await prisma.amenity.create({ data: { name, slug: slugify(name), icon, sortOrder: i } });
    amenities.set(name, a.id);
  }
  const categories = new Map<string, string>();
  for (const [i, [name, description, photo]] of CATEGORIES.entries()) {
    const c = await prisma.category.create({ data: { name, slug: slugify(name), description, imageUrl: img(photo, 900), sortOrder: i } });
    categories.set(name, c.id);
  }
  const counties = new Map<string, string>();
  const towns = new Map<string, { id: string; lat: number; lng: number }>();
  for (const c of COUNTIES) {
    const county = await prisma.county.create({ data: { name: c.name, slug: slugify(c.name), lat: c.lat, lng: c.lng, popular: c.popular, imageUrl: img(c.image, 900) } });
    counties.set(c.name, county.id);
    for (const [name, lat, lng] of c.towns) {
      const t = await prisma.town.create({ data: { countyId: county.id, name, slug: slugify(name), lat, lng } });
      towns.set(name, { id: t.id, lat, lng });
    }
  }

  // ── Admins
  await prisma.user.create({ data: { name: "Esther Mwikali", email: "admin@homevista.co.ke", phone: "254700000001", phoneVerified: true, emailVerified: true, passwordHash: pw, role: "ADMIN", isSuperAdmin: true, createdAt: daysAgo(200) } });
  await prisma.user.create({ data: { name: "Collins Kibet", email: "moderator@homevista.co.ke", phone: "254700000002", phoneVerified: true, emailVerified: true, passwordHash: pw, role: "ADMIN", adminPermissions: ["analytics", "kyc", "listings", "reviews"], createdAt: daysAgo(150) } });

  // ── Listers
  const listers = new Map<string, { id: string; userId: string }>();
  for (const [i, l] of LISTERS.entries()) {
    const joined = 170 - i * 9;
    const user = await prisma.user.create({
      data: {
        name: l.name, email: l.email, phone: l.phone, phoneVerified: true, emailVerified: true, passwordHash: pw, role: "LISTER",
        avatarUrl: l.avatar ? img(l.avatar, 200) : null, createdAt: daysAgo(joined),
        lister: {
          create: {
            type: l.type, displayName: l.display, slug: slugify(l.display), bio: l.bio || null, phone: l.phone, whatsapp: l.phone, email: l.email,
            website: l.website ?? null, kycStatus: l.kyc, verified: l.kyc === "APPROVED", verifiedAt: l.kyc === "APPROVED" ? daysAgo(joined - 2) : null,
            createdAt: daysAgo(joined),
          },
        },
      },
      include: { lister: true },
    });
    const lister = user.lister!;
    listers.set(l.key, { id: lister.id, userId: user.id });

    if (l.kyc !== "NOT_SUBMITTED") {
      await prisma.kycSubmission.create({
        data: {
          listerId: lister.id, status: l.kyc, fullName: l.name, idType: "NATIONAL_ID", idNumber: String(int(20000000, 39999999)), phone: l.phone, email: l.email,
          address: "Nairobi, Kenya", idFrontKey: "seed/sample-id-front.jpg", idBackKey: "seed/sample-id-back.jpg", selfieKey: "seed/sample-selfie.jpg",
          businessCertKey: l.type === "COMPANY" || l.type === "DEVELOPER" ? "seed/sample-certificate.jpg" : null,
          kraPin: l.type === "COMPANY" || l.type === "DEVELOPER" ? `P05${int(1000000, 9999999)}Q` : null,
          earbNumber: l.type === "REALTOR" ? `EARB/R/${int(1000, 2999)}` : null,
          reviewNote: l.kyc === "REJECTED" ? "The ID photo is unreadable and the selfie does not match the ID. Please upload clear photos." : null,
          reviewedAt: ["APPROVED", "REJECTED"].includes(l.kyc) ? daysAgo(joined - 2) : null,
          createdAt: daysAgo(joined - 1),
        },
      });
    }

    // Subscription history: back-to-back 30-day periods from joining until now.
    if (l.sub !== "none") {
      const endOffset = l.sub === "expiring" ? 2 * DAY - 3 * 3600_000 : l.sub === "expired" ? -5 * DAY : int(8, 26) * DAY;
      let end = now + endOffset;
      const periods: { start: number; end: number }[] = [];
      while (end - 30 * DAY > now - joined * DAY) {
        periods.unshift({ start: end - 30 * DAY, end });
        end -= 30 * DAY;
      }
      for (const p of periods) {
        const pay = await prisma.payment.create({
          data: { reference: ref(), userId: user.id, kind: "SUBSCRIPTION", amount: 1000, phone: l.phone, status: "SUCCESS", mpesaReceipt: receipt(), resultCode: 0, resultDesc: "Paid", checkoutRequestId: `ws_CO_SEED_${crypto.randomBytes(6).toString("hex")}`, createdAt: new Date(p.start), completedAt: new Date(p.start + 20_000) },
        });
        await prisma.subscription.create({
          data: { listerId: lister.id, paymentId: pay.id, amount: 1000, startsAt: new Date(p.start), endsAt: new Date(p.end), remindersSent: p.end < now ? [5, 2, 1] : [], expiredNoticeSent: p.end < now, createdAt: new Date(p.start) },
        });
      }
      await prisma.listerProfile.update({ where: { id: lister.id }, data: { subscriptionEndsAt: new Date(now + endOffset) } });
    }
  }

  // ── Properties
  const props: { id: string; listerKey: string; purpose: Purpose; visible: boolean }[] = [];
  for (const [i, p] of PROPERTIES.entries()) {
    const town = towns.get(p.town)!;
    const lat = town.lat + (rand() - 0.5) * 0.02;
    const lng = town.lng + (rand() - 0.5) * 0.02;
    const slug = `${slugify(p.title)}-${(i + 101).toString(36)}`;
    const published = int(1, 75);
    const l = LISTERS.find((x) => x.key === p.lister)!;
    const created = await prisma.property.create({
      data: {
        slug, listerId: listers.get(p.lister)!.id, title: p.title, description: p.desc, purpose: p.purpose, typeId: types.get(p.type)!,
        price: p.price, pricePeriod: p.period ?? "TOTAL", countyId: counties.get(p.county)!, townId: town.id, estate: p.estate,
        address: p.address, lat, lng, ...approximate(lat, lng, slug),
        bedrooms: p.beds ?? null, bathrooms: p.baths ?? null, size: p.size ?? null, sizeUnit: p.unit ?? "SQFT", furnished: !!p.furnished,
        videoUrl: p.video ?? null, tourUrl: p.tour ?? null, titleDeed: p.titleDeed ?? null,
        availableFrom: p.purpose === "OFF_PLAN" ? new Date(now + 400 * DAY) : rand() > 0.6 ? new Date(now + int(5, 45) * DAY) : null,
        status: l.kyc === "APPROVED" ? "ACTIVE" : "PENDING", featured: !!p.featured, featuredRank: p.featured ? int(1, 10) : 0,
        views: 0, publishedAt: daysAgo(published), createdAt: daysAgo(published + 1),
        images: { create: p.photos.map((ph, j) => ({ url: img(ph), alt: `${p.title} — photo ${j + 1}`, sortOrder: j })) },
        amenities: { connect: p.amenities.map((a) => ({ id: amenities.get(a)! })) },
        categories: { connect: (p.categories ?? []).map((c) => ({ id: categories.get(c)! })) },
      },
    });
    props.push({ id: created.id, listerKey: p.lister, purpose: p.purpose, visible: l.kyc === "APPROVED" });

    // Daily views for the last 60 days (more for featured).
    const base = p.featured ? 14 : 5;
    const rows = [];
    let total = 0;
    for (let d = 0; d < Math.min(60, published); d++) {
      const c = Math.max(0, Math.round(base * (0.5 + rand()) * (d < 7 ? 1.3 : 1)));
      total += c;
      rows.push({ propertyId: created.id, day: new Date(new Date(now - d * DAY).toISOString().slice(0, 10)), count: c });
    }
    if (rows.length) await prisma.propertyViewDay.createMany({ data: rows });
    await prisma.property.update({ where: { id: created.id }, data: { views: total + int(20, 120) } });
  }

  // ── Viewers
  const viewers: { id: string; phone: string }[] = [];
  for (const [i, name] of VIEWER_NAMES.entries()) {
    const first = name.split(" ")[0]!.toLowerCase();
    const phone = `2547${String(10000000 + i * 7919).slice(0, 8)}`;
    const u = await prisma.user.create({
      data: { name, email: i === 0 ? "wanjiku@example.com" : `${first}.${i}@example.com`, phone, phoneVerified: true, emailVerified: true, passwordHash: pw, role: "USER", createdAt: daysAgo(int(1, 180)) },
    });
    viewers.push({ id: u.id, phone });
  }

  // ── Unlock payments, unlocks and failed attempts
  const visible = props.filter((p) => p.visible);
  const unlocked = new Set<string>();
  for (let n = 0; n < 140; n++) {
    const v = n < 6 ? viewers[0]! : pick(viewers);
    const p = pick(visible);
    const key = `${v.id}:${p.id}`;
    const when = daysAgo(int(0, 120));
    const r = rand();
    const status = unlocked.has(key) ? "FAILED" : r < 0.8 ? "SUCCESS" : r < 0.9 ? "CANCELLED" : r < 0.96 ? "TIMEOUT" : "FAILED";
    const pay = await prisma.payment.create({
      data: {
        reference: ref(), userId: v.id, kind: "UNLOCK", amount: 250, phone: v.phone, propertyId: p.id, status,
        mpesaReceipt: status === "SUCCESS" ? receipt() : null, resultCode: status === "SUCCESS" ? 0 : status === "CANCELLED" ? 1032 : status === "TIMEOUT" ? 1037 : 1,
        resultDesc: status === "SUCCESS" ? "Paid" : status === "CANCELLED" ? "You cancelled the M-Pesa prompt. No money was taken." : status === "TIMEOUT" ? "The M-Pesa prompt timed out before a PIN was entered." : "Your M-Pesa balance is too low for this payment.",
        checkoutRequestId: `ws_CO_SEED_${crypto.randomBytes(6).toString("hex")}`, createdAt: when, completedAt: new Date(when.getTime() + 25_000),
      },
    });
    if (status === "SUCCESS") {
      unlocked.add(key);
      await prisma.unlock.create({ data: { userId: v.id, propertyId: p.id, paymentId: pay.id, createdAt: when } });
      await prisma.property.update({ where: { id: p.id }, data: { unlockCount: { increment: 1 } } });
    }
  }

  // ── Reviews (unlockers review more often → "Verified Viewer")
  for (const p of visible) {
    const count = int(0, 5);
    const reviewers = [...viewers].sort(() => rand() - 0.5).slice(0, count);
    const texts = [...REVIEW_TEXTS].sort(() => rand() - 0.5);
    for (const [k, v] of reviewers.entries()) {
      const [rating, comment] = texts[k % texts.length]!;
      const created = daysAgo(int(0, 60));
      const hasReply = rand() > 0.55;
      await prisma.review.create({
        data: { propertyId: p.id, userId: v.id, rating, comment, createdAt: created, reply: hasReply ? pick(REPLIES) : null, repliedAt: hasReply ? new Date(created.getTime() + DAY) : null },
      });
    }
    const agg = await prisma.review.aggregate({ where: { propertyId: p.id }, _avg: { rating: true }, _count: true });
    await prisma.property.update({ where: { id: p.id }, data: { ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10, ratingCount: agg._count } });
  }
  // One flagged review for the moderation queue.
  const flaggedTarget = visible[3]!;
  const troll = viewers[viewers.length - 1]!;
  await prisma.review.upsert({
    where: { propertyId_userId: { propertyId: flaggedTarget.id, userId: troll.id } },
    create: { propertyId: flaggedTarget.id, userId: troll.id, rating: 1, comment: "Total waste of time, these people are crooks!!! Call me on 0711 000 000 for a better deal", flagged: true },
    update: { flagged: true },
  });

  // ── Favourites & saved searches for the demo seeker
  for (const p of visible.slice(0, 7)) await prisma.favourite.create({ data: { userId: viewers[0]!.id, propertyId: p.id } }).catch(() => {});
  for (const v of viewers.slice(1, 15)) for (const p of [pick(visible), pick(visible)]) await prisma.favourite.create({ data: { userId: v.id, propertyId: p.id } }).catch(() => {});
  await prisma.savedSearch.createMany({ data: [
    { userId: viewers[0]!.id, name: "3+ bed apartments to rent in Kilimani", query: "purpose=for-rent&type=apartments&town=kilimani&beds=3" },
    { userId: viewers[0]!.id, name: "Land under KSh 5M in Kisumu", query: "purpose=for-sale&type=land-plots&county=kisumu&maxPrice=5000000", alerts: false },
  ] });

  // ── Reports
  await prisma.report.createMany({ data: [
    { reporterId: viewers[4]!.id, propertyId: visible[10]!.id, reason: "Property no longer available", details: "Called and was told it was let two weeks ago." },
    { reporterId: viewers[7]!.id, propertyId: visible[15]!.id, reason: "Wrong price or details", details: "Price on the phone was 20% higher than listed." },
  ] });

  // ── Messages to listers
  const vista = listers.get("vista")!;
  const vistaProps = props.filter((p) => p.listerKey === "vista");
  await prisma.message.createMany({ data: [
    { propertyId: vistaProps[0]!.id, senderId: viewers[0]!.id, listerId: vista.id, body: "Hello Grace, is the Runda villa still available? We'd love to view it this Saturday morning.", createdAt: daysAgo(1) },
    { propertyId: vistaProps[1]!.id, senderId: viewers[2]!.id, listerId: vista.id, body: "Good afternoon. Is the price negotiable for a cash buyer? Thank you.", createdAt: daysAgo(3), readAt: daysAgo(2) },
  ] });

  // ── Companies & realtors
  const companyIds = new Map<string, string>();
  for (const c of COMPANIES) {
    const co = await prisma.company.create({
      data: { name: c.name, slug: slugify(c.name), description: c.description, phone: c.phone, email: c.email, website: c.website, address: c.address, areasServed: c.areas, verified: c.verified, featured: c.featured, foundedYear: c.founded, coverUrl: img(c.cover, 1400) },
    });
    companyIds.set(c.name, co.id);
  }
  for (const r of REALTORS) {
    await prisma.realtor.create({
      data: {
        name: r.name, slug: slugify(r.name), photoUrl: img(r.photo, 600), bio: r.bio, companyId: r.company ? companyIds.get(r.company) : null,
        listerId: r.lister ? listers.get(r.lister)!.id : null, phone: r.phone, email: r.email, specialties: r.specialties, areas: r.areas,
        earbNumber: r.earb, yearsExperience: r.years, rating: r.rating, ratingCount: r.count, verified: !!r.earb, featured: r.featured,
      },
    });
  }

  // ── Adverts
  const in60 = new Date(now + 60 * DAY);
  await prisma.advert.createMany({ data: [
    { title: "Skyline Residences — from KSh 4.9M", subtitle: "Rooftop pool, 24-month payment plan, Westlands.", imageUrl: img(PH.office[2]!, 1800), linkUrl: "https://skyline.example.co.ke", placement: "HOME_HERO", startsAt: daysAgo(20), endsAt: in60, impressions: 18420, clicks: 412 },
    { title: "Mortgage rates from 11.5%", subtitle: "Pre-qualify in 5 minutes with our partner bank.", imageUrl: img(PH.living[0]!, 900), linkUrl: "https://example.com/mortgage", placement: "SIDEBAR", startsAt: daysAgo(30), endsAt: in60, impressions: 9210, clicks: 166 },
    { title: "Movers you can trust", subtitle: "Insured house moving across Kenya. Free quote.", imageUrl: img(PH.house[0]!, 1600), linkUrl: "https://example.com/movers", placement: "BETWEEN_LISTINGS", startsAt: daysAgo(10), endsAt: in60, impressions: 6400, clicks: 98 },
    { title: "Diani Beach Villas — book your festive stay", subtitle: "Coastal Havens Properties · Private pools, ocean views.", imageUrl: img(PH.resort[1]!, 1800), linkUrl: "https://coastalhavens.example.co.ke", placement: "FOOTER", startsAt: daysAgo(5), endsAt: in60, impressions: 3200, clicks: 61 },
    { title: "Expired campaign", subtitle: null, imageUrl: img(PH.house[3]!, 900), linkUrl: "https://example.com", placement: "SIDEBAR", startsAt: daysAgo(90), endsAt: daysAgo(30), active: false, impressions: 22000, clicks: 300 },
  ] });

  // ── Content
  for (const [i, b] of BLOG.entries()) {
    await prisma.blogPost.create({ data: { slug: slugify(b.title), title: b.title, excerpt: b.excerpt, body: b.body, coverUrl: img(b.cover, 1600), tags: b.tags, published: true, publishedAt: daysAgo(4 + i * 9) } });
  }
  await prisma.faq.createMany({ data: FAQS.map(([group, question, answer], i) => ({ group, question, answer, sortOrder: i })) });
  for (const [slug, p] of Object.entries(PAGES)) await prisma.page.create({ data: { slug, title: p.title, body: p.body } });
  await prisma.testimonial.createMany({ data: TESTIMONIALS.map((t, i) => ({ name: t.name, role: t.role, quote: t.quote, avatarUrl: img(t.avatar, 200), sortOrder: i })) });

  // ── Notifications for demo accounts
  await prisma.notification.createMany({ data: [
    { userId: listers.get("vista")!.userId, title: "KYC approved — you're verified", body: "Your gold Verified badge is now live on your profile and listings.", link: "/lister/kyc", read: true, createdAt: daysAgo(150) },
    { userId: listers.get("vista")!.userId, title: "New enquiry", body: "Wanjiku Kariuki sent you a message about your Runda villa.", link: "/lister/messages", createdAt: daysAgo(1) },
    { userId: listers.get("lakeside")!.userId, title: "Subscription ends in 2 days", body: "Renew for KSh 1,000 via M-Pesa to keep your listings visible.", link: "/lister/subscription", createdAt: daysAgo(0) },
    { userId: listers.get("rejected")!.userId, title: "KYC needs attention", body: "Your verification was rejected: The ID photo is unreadable. Please resubmit.", link: "/lister/kyc", createdAt: daysAgo(10) },
    { userId: viewers[0]!.id, title: "Welcome to HomeVista Ke", body: "Save homes you love and unlock any property's exact location and contacts for KSh 250.", link: "/properties", read: true, createdAt: daysAgo(60) },
  ] });

  // Sample KYC documents (clearly marked) so the admin review screen has something to show.
  const dir = path.join(process.cwd(), "storage", "private", "seed");
  await fs.mkdir(dir, { recursive: true });
  const docs: [string, string, string][] = [
    ["sample-id-front.jpg", "REPUBLIC OF KENYA", "National Identity Card — FRONT"],
    ["sample-id-back.jpg", "REPUBLIC OF KENYA", "National Identity Card — BACK"],
    ["sample-selfie.jpg", "SELFIE WITH ID", "Applicant holding ID"],
    ["sample-certificate.jpg", "CERTIFICATE OF INCORPORATION", "Registrar of Companies"],
  ];
  for (const [file, title, sub] of docs) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760"><rect width="100%" height="100%" rx="36" fill="#f3eee5"/><rect x="24" y="24" width="1152" height="712" rx="28" fill="none" stroke="#c9a86a" stroke-width="4" stroke-dasharray="18 12"/><text x="600" y="300" font-family="Georgia" font-size="58" text-anchor="middle" fill="#0c1a2e">${title}</text><text x="600" y="370" font-family="Helvetica" font-size="32" text-anchor="middle" fill="#4a5161">${sub}</text><text x="600" y="520" font-family="Helvetica" font-size="44" font-weight="bold" text-anchor="middle" fill="#b4423a">SAMPLE — NOT A REAL DOCUMENT</text></svg>`;
    await fs.writeFile(path.join(dir, file), await sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toBuffer());
  }

  const counts = await Promise.all([prisma.user.count(), prisma.property.count(), prisma.payment.count(), prisma.review.count()]);
  console.log(`Seeded: ${counts[0]} users, ${counts[1]} properties, ${counts[2]} payments, ${counts[3]} reviews.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
