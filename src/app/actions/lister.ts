"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ListingStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertLister } from "@/lib/auth";
import { safeAction, UserError, type ActionResult } from "@/lib/action";
import { rateLimit } from "@/lib/ratelimit";
import { getSettings } from "@/lib/settings";
import { approximate } from "@/lib/listings";
import { isFile, savePrivateDocument, savePublicImage } from "@/lib/uploads";
import { deleteFile, keyFromPublicUrl } from "@/lib/storage";
import { MAX_PROPERTY_IMAGES, PURPOSES } from "@/lib/constants";
import { normalizeKePhone, slugify } from "@/lib/format";
import { notifyInApp } from "@/lib/notify";
import { logActivity } from "@/lib/activity";

const optInt = z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().int().min(0).max(1000).optional());
const optNum = z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().min(0).max(100_000_000).optional());
const optUrl = z.preprocess(
  (v) => (typeof v === "string" && v.trim() ? v.trim() : undefined),
  z.string().url("Enter a full link starting with https://").refine((u) => /^https:\/\//.test(u), "Links must start with https://").optional(),
);

const listingSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(10, "Give the listing a descriptive title (10+ characters).").max(120),
  description: z.string().trim().min(40, "Describe the property in at least a couple of sentences.").max(8000),
  purpose: z.enum(PURPOSES),
  typeId: z.string().min(1, "Choose a property type."),
  price: z.coerce.number({ invalid_type_error: "Enter a price." }).int().min(1, "Enter a price.").max(10_000_000_000),
  pricePeriod: z.enum(["TOTAL", "MONTH", "NIGHT", "WEEK", "YEAR"]),
  countyId: z.string().min(1, "Choose a county."),
  townId: z.string().optional(),
  estate: z.string().trim().max(80).optional(),
  address: z.string().trim().min(3, "Enter the exact address (only shown after unlock).").max(200),
  lat: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().min(-5.5).max(5.5).optional()),
  lng: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().min(33.5).max(42.5).optional()),
  bedrooms: optInt,
  bathrooms: optInt,
  size: optNum,
  sizeUnit: z.enum(["SQFT", "SQM", "ACRES"]),
  furnished: z.string().optional(),
  titleDeed: z.string().optional(),
  videoUrl: optUrl,
  tourUrl: optUrl,
  availableFrom: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.date().optional()),
  intent: z.enum(["publish", "draft"]).default("publish"),
});

export async function saveListingAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const res = await safeAction(async () => {
    const user = await assertLister();
    if (!(await rateLimit(`listing-save:${user.id}`, 40, 3600)).ok) throw new UserError("You're saving very quickly — please wait a few minutes.");
    const raw = Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string"));
    const d = listingSchema.parse(raw);
    const lister = await prisma.listerProfile.findUniqueOrThrow({ where: { id: user.listerId } });
    const existing = d.id ? await prisma.property.findUnique({ where: { id: d.id }, include: { images: true } }) : null;
    if (d.id && (!existing || existing.listerId !== lister.id)) throw new UserError("Listing not found.");
    if (existing?.status === "REMOVED") throw new UserError("This listing was removed by a moderator and can't be edited.");

    const town = d.townId ? await prisma.town.findUnique({ where: { id: d.townId } }) : null;
    if (town && town.countyId !== d.countyId) throw new UserError("The town doesn't belong to that county.");
    const county = await prisma.county.findUniqueOrThrow({ where: { id: d.countyId } });
    const lat = d.lat ?? town?.lat ?? county.lat;
    const lng = d.lng ?? town?.lng ?? county.lng;

    const amenityIds = fd.getAll("amenities").map(String).slice(0, 60);
    const categoryIds = fd.getAll("categories").map(String).slice(0, 10);

    // Photos: keep the existing ones the lister left in the form (in their chosen order), then add uploads.
    const keep = fd.getAll("keepImages").map(String);
    const files = fd.getAll("images").filter(isFile);
    const keptImages = (existing?.images ?? []).filter((i) => keep.includes(i.id)).sort((a, b) => keep.indexOf(a.id) - keep.indexOf(b.id));
    if (keptImages.length + files.length > MAX_PROPERTY_IMAGES) throw new UserError(`You can upload up to ${MAX_PROPERTY_IMAGES} photos.`);
    if (keptImages.length + files.length === 0 && d.intent === "publish") throw new UserError("Add at least one photo.");
    const uploaded: string[] = [];
    for (const f of files) uploaded.push(await savePublicImage(f, "properties"));
    // Final photo order: explicit tokens from the editor ("e:<existing id>" | "n:<upload index>"), else kept-then-new.
    const order = fd.getAll("imageOrder").map(String);
    const byId = new Map(keptImages.map((i) => [i.id, i.url]));
    const finalUrls = order.length
      ? order.map((t) => (t.startsWith("e:") ? byId.get(t.slice(2)) : uploaded[Number(t.slice(2))])).filter((u): u is string => !!u)
      : [...keptImages.map((i) => i.url), ...uploaded];

    const settings = await getSettings();
    let status: ListingStatus;
    if (d.intent === "draft") status = "DRAFT";
    else if (existing && existing.status === "ACTIVE") status = "ACTIVE";
    else if (existing && existing.status === "PAUSED") status = "PAUSED";
    else status = settings.requireListingApproval && !(settings.autoPublishVerified && lister.verified) ? "PENDING" : "ACTIVE";

    const data = {
      title: d.title,
      description: d.description,
      purpose: d.purpose,
      typeId: d.typeId,
      price: d.price,
      pricePeriod: d.purpose === "SALE" || d.purpose === "OFF_PLAN" ? ("TOTAL" as const) : d.pricePeriod,
      countyId: d.countyId,
      townId: town?.id ?? null,
      estate: d.estate || null,
      address: d.address,
      lat,
      lng,
      bedrooms: d.bedrooms ?? null,
      bathrooms: d.bathrooms ?? null,
      size: d.size ?? null,
      sizeUnit: d.sizeUnit,
      furnished: d.furnished === "on",
      titleDeed: d.purpose === "SALE" || d.purpose === "OFF_PLAN" ? d.titleDeed === "on" : null,
      videoUrl: d.videoUrl ?? null,
      tourUrl: d.tourUrl ?? null,
      availableFrom: d.availableFrom ?? null,
      status,
      statusNote: status === "PENDING" ? null : existing?.statusNote,
      publishedAt: status === "ACTIVE" ? (existing?.publishedAt ?? new Date()) : existing?.publishedAt,
      amenities: { set: amenityIds.map((id) => ({ id })) },
      categories: { set: categoryIds.map((id) => ({ id })) },
    };

    let id: string;
    if (existing) {
      const removed = existing.images.filter((i) => !keep.includes(i.id));
      await prisma.$transaction([
        prisma.property.update({ where: { id: existing.id }, data: { ...data, ...approximate(lat, lng, existing.slug) } }),
        prisma.propertyImage.deleteMany({ where: { propertyId: existing.id } }),
        prisma.propertyImage.createMany({
          data: finalUrls.map((url, sortOrder) => ({ propertyId: existing.id, url, sortOrder, alt: `${d.title} — photo ${sortOrder + 1}` })),
        }),
      ]);
      for (const r of removed) {
        const key = keyFromPublicUrl(r.url);
        if (key) await deleteFile("public", key);
      }
      id = existing.id;
    } else {
      const slug = `${slugify(d.title, 50)}-${Date.now().toString(36).slice(-5)}`;
      const created = await prisma.property.create({
        data: {
          ...data,
          slug,
          listerId: lister.id,
          ...approximate(lat, lng, slug),
          amenities: { connect: amenityIds.map((id) => ({ id })) },
          categories: { connect: categoryIds.map((id) => ({ id })) },
          images: { create: finalUrls.map((url, sortOrder) => ({ url, sortOrder, alt: `${d.title} — photo ${sortOrder + 1}` })) },
        },
      });
      id = created.id;
    }
    await logActivity(user.id, existing ? "listing.updated" : "listing.created", id, status);
    revalidatePath("/lister/listings");
    return {
      ok: true as const,
      message:
        status === "PENDING" ? "submitted" : status === "DRAFT" ? "draft" : "live",
    };
  });
  if (res.ok) redirect(`/lister/listings?saved=${res.message}`);
  return res;
}

export async function setListingStatusAction(id: string, action: "pause" | "resume" | "delete"): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await assertLister();
    const p = await prisma.property.findUnique({ where: { id }, include: { images: true } });
    if (!p || p.listerId !== user.listerId) throw new UserError("Listing not found.");
    if (action === "delete") {
      await prisma.property.delete({ where: { id } });
      for (const img of p.images) {
        const key = keyFromPublicUrl(img.url);
        if (key) await deleteFile("public", key);
      }
    } else if (action === "pause") {
      if (p.status !== "ACTIVE") throw new UserError("Only live listings can be paused.");
      await prisma.property.update({ where: { id }, data: { status: "PAUSED" } });
    } else {
      if (p.status !== "PAUSED" && p.status !== "DRAFT") throw new UserError("This listing can't be resumed.");
      const settings = await getSettings();
      const lister = await prisma.listerProfile.findUniqueOrThrow({ where: { id: user.listerId } });
      const needsReview = p.status === "DRAFT" && settings.requireListingApproval && !(settings.autoPublishVerified && lister.verified);
      if (p.status === "DRAFT" && !(await prisma.propertyImage.count({ where: { propertyId: id } }))) throw new UserError("Add at least one photo before publishing.");
      await prisma.property.update({ where: { id }, data: { status: needsReview ? "PENDING" : "ACTIVE", publishedAt: p.publishedAt ?? new Date() } });
    }
    await logActivity(user.id, `listing.${action}`, id);
    revalidatePath("/lister/listings");
    return { ok: true as const };
  });
}

const kycSchema = z.object({
  fullName: z.string().trim().min(3, "Enter your full legal name.").max(100),
  idType: z.enum(["NATIONAL_ID", "PASSPORT"]),
  idNumber: z.string().trim().regex(/^[A-Z0-9]{5,12}$/i, "Enter a valid ID or passport number."),
  phone: z.string().trim(),
  email: z.string().trim().email(),
  address: z.string().trim().min(5, "Enter your physical address.").max(200),
  kraPin: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().regex(/^[AP]\d{9}[A-Z]$/i, "KRA PIN format is A123456789B.").optional()),
  earbNumber: z.string().trim().max(40).optional(),
});

export async function submitKycAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await assertLister();
    if (!(await rateLimit(`kyc:${user.id}`, 5, 86400)).ok) throw new UserError("Too many submissions today. Please try again tomorrow.");
    const lister = await prisma.listerProfile.findUniqueOrThrow({ where: { id: user.listerId } });
    if (["PENDING", "UNDER_REVIEW"].includes(lister.kycStatus)) throw new UserError("Your documents are already being reviewed.");
    if (lister.kycStatus === "APPROVED") throw new UserError("You're already verified.");
    const d = kycSchema.parse(Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string")));
    const phone = normalizeKePhone(d.phone);
    if (!phone) throw new UserError("Enter a valid Kenyan phone number.");
    const isBusiness = lister.type === "COMPANY" || lister.type === "DEVELOPER" || lister.type === "AGENT";
    if (isBusiness && lister.type !== "AGENT" && !d.kraPin) throw new UserError("Companies and developers must provide a KRA PIN.");
    if (lister.type === "REALTOR" && !d.earbNumber) throw new UserError("Realtors must provide their EARB registration number.");

    const need = (name: string, label: string) => {
      const f = fd.get(name);
      if (!isFile(f)) throw new UserError(`Please upload ${label}.`);
      return f;
    };
    const idFront = need("idFront", "the front of your ID");
    const idBack = need("idBack", "the back of your ID");
    const selfie = need("selfie", "a selfie holding your ID");
    const cert = fd.get("businessCert");
    const kraFile = fd.get("kraPinFile");
    const ownership = fd.get("ownershipProof");
    if ((lister.type === "COMPANY" || lister.type === "DEVELOPER") && !isFile(cert)) throw new UserError("Please upload your business registration certificate.");

    const folder = `kyc/${lister.id}`;
    const sub = await prisma.kycSubmission.create({
      data: {
        listerId: lister.id,
        fullName: d.fullName,
        idType: d.idType,
        idNumber: d.idNumber.toUpperCase(),
        phone,
        email: d.email,
        address: d.address,
        kraPin: d.kraPin?.toUpperCase() ?? null,
        earbNumber: d.earbNumber || null,
        idFrontKey: await savePrivateDocument(idFront, folder),
        idBackKey: await savePrivateDocument(idBack, folder),
        selfieKey: await savePrivateDocument(selfie, folder),
        businessCertKey: isFile(cert) ? await savePrivateDocument(cert, folder) : null,
        kraPinKey: isFile(kraFile) ? await savePrivateDocument(kraFile, folder) : null,
        ownershipProofKey: isFile(ownership) ? await savePrivateDocument(ownership, folder) : null,
      },
    });
    await prisma.listerProfile.update({ where: { id: lister.id }, data: { kycStatus: "PENDING" } });
    await notifyInApp(user.id, "KYC submitted", "Thanks! We'll review your documents within 1–2 business days and notify you by email.", "/lister/kyc");
    const admins = await prisma.user.findMany({ where: { role: "ADMIN", OR: [{ isSuperAdmin: true }, { adminPermissions: { has: "kyc" } }] }, select: { id: true } });
    for (const a of admins) await notifyInApp(a.id, "New KYC submission", `${lister.displayName} submitted verification documents.`, `/admin/kyc/${sub.id}`);
    await logActivity(user.id, "kyc.submitted", sub.id);
    revalidatePath("/lister/kyc");
    return { ok: true as const, message: "Documents submitted. We'll notify you as soon as they're reviewed." };
  });
}

const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  bio: z.string().trim().max(1500).optional(),
  phone: z.string().trim(),
  whatsapp: z.string().trim().optional(),
  email: z.string().trim().email(),
  website: optUrl,
});

export async function updateListerProfileAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await assertLister();
    const d = profileSchema.parse(Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string")));
    const phone = normalizeKePhone(d.phone);
    if (!phone) throw new UserError("Enter a valid contact phone number.");
    const whatsapp = d.whatsapp ? normalizeKePhone(d.whatsapp) : null;
    if (d.whatsapp && !whatsapp) throw new UserError("Enter a valid WhatsApp number.");
    const logo = fd.get("logo");
    const logoUrl = isFile(logo) ? await savePublicImage(logo, "logos", { maxWidth: 400, maxHeight: 400 }) : undefined;
    await prisma.listerProfile.update({
      where: { id: user.listerId },
      data: { displayName: d.displayName, bio: d.bio || null, phone, whatsapp, email: d.email, website: d.website ?? null, ...(logoUrl ? { logoUrl } : {}) },
    });
    revalidatePath("/lister/profile");
    return { ok: true as const, message: "Profile saved." };
  });
}

export async function replyReviewAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await assertLister();
    const reviewId = String(fd.get("reviewId") ?? "");
    const reply = String(fd.get("reply") ?? "").trim();
    if (reply.length > 1000) throw new UserError("Replies are limited to 1,000 characters.");
    const r = await prisma.review.findUnique({ where: { id: reviewId }, include: { property: { select: { listerId: true, slug: true, title: true } } } });
    if (!r || r.property.listerId !== user.listerId) throw new UserError("Review not found.");
    await prisma.review.update({ where: { id: reviewId }, data: { reply: reply || null, repliedAt: reply ? new Date() : null } });
    if (reply) await notifyInApp(r.userId, "The lister replied to your review", `On "${r.property.title}".`, `/properties/${r.property.slug}#reviews`);
    revalidatePath(`/properties/${r.property.slug}`);
    revalidatePath("/lister/reviews");
    return { ok: true as const, message: reply ? "Reply posted." : "Reply removed." };
  });
}

export async function markMessageReadAction(id: string): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await assertLister();
    await prisma.message.updateMany({ where: { id, listerId: user.listerId }, data: { readAt: new Date() } });
    revalidatePath("/lister/messages");
    return { ok: true as const };
  });
}
