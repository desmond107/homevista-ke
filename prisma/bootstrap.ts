/*
 * Prepares a PRODUCTION database: settings, taxonomy (types, amenities, collections, counties, towns),
 * starter FAQs and legal pages, and your first super admin. Never deletes anything and only adds
 * what is missing, so it is safe to re-run. No demo users, listings or reviews.
 *
 *   BOOTSTRAP_ADMIN_EMAIL=you@homevista.co.ke BOOTSTRAP_ADMIN_NAME="Your Name" \
 *   BOOTSTRAP_ADMIN_PASSWORD='a long password' DATABASE_URL=... npm run db:bootstrap
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { AMENITIES, CATEGORIES, COUNTIES, FAQS, PAGES, TYPES, img } from "./seed-data";

const prisma = new PrismaClient();

const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60).replace(/-$/, "");

async function main() {
  // ── Settings (existing values set in Admin → Settings are kept)
  for (const [key, value] of [["unlock_price", "250"], ["subscription_price", "1000"], ["subscription_days", "30"]]) {
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }

  // ── Taxonomy
  for (const [i, [name, icon]] of TYPES.entries()) {
    await prisma.propertyType.upsert({ where: { slug: slugify(name) }, update: {}, create: { name, slug: slugify(name), icon, sortOrder: i } });
  }
  for (const [i, [name, icon]] of AMENITIES.entries()) {
    await prisma.amenity.upsert({ where: { slug: slugify(name) }, update: {}, create: { name, slug: slugify(name), icon, sortOrder: i } });
  }
  for (const [i, [name, description, photo]] of CATEGORIES.entries()) {
    await prisma.category.upsert({
      where: { slug: slugify(name) },
      update: {},
      create: { name, slug: slugify(name), description, imageUrl: img(photo, 900), sortOrder: i },
    });
  }
  for (const c of COUNTIES) {
    const county = await prisma.county.upsert({
      where: { slug: slugify(c.name) },
      update: {},
      create: { name: c.name, slug: slugify(c.name), lat: c.lat, lng: c.lng, popular: c.popular, imageUrl: img(c.image, 900) },
    });
    for (const [name, lat, lng] of c.towns) {
      await prisma.town.upsert({
        where: { countyId_slug: { countyId: county.id, slug: slugify(name) } },
        update: {},
        create: { countyId: county.id, name, slug: slugify(name), lat, lng },
      });
    }
  }

  // ── Starter content (edit it later in Admin → Content)
  if ((await prisma.faq.count()) === 0) {
    await prisma.faq.createMany({ data: FAQS.map(([group, question, answer], i) => ({ group, question, answer, sortOrder: i })) });
  }
  for (const [slug, p] of Object.entries(PAGES)) {
    await prisma.page.upsert({ where: { slug }, update: {}, create: { slug, title: p.title, body: p.body } });
  }

  // ── First super admin
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!email) {
    console.log("No BOOTSTRAP_ADMIN_EMAIL set: skipped creating a super admin.");
  } else if (await prisma.user.findUnique({ where: { email } })) {
    console.log(`${email} already exists: left unchanged.`);
  } else {
    if (!name) throw new Error("Set BOOTSTRAP_ADMIN_NAME.");
    if (!password || password.length < 12) throw new Error("Set BOOTSTRAP_ADMIN_PASSWORD to at least 12 characters.");
    await prisma.user.create({
      data: { name, email, emailVerified: true, passwordHash: await bcrypt.hash(password, 12), role: "ADMIN", isSuperAdmin: true },
    });
    console.log(`Created super admin ${email}.`);
  }

  const counts = await Promise.all([prisma.propertyType.count(), prisma.amenity.count(), prisma.county.count(), prisma.town.count()]);
  console.log(`Done. ${counts[0]} property types, ${counts[1]} amenities, ${counts[2]} counties, ${counts[3]} towns.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
