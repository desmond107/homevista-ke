"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { AdPlacement, KycStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertAdmin, destroyAllSessions } from "@/lib/auth";
import { safeAction, UserError, type ActionResult } from "@/lib/action";
import { ALL_ADMIN_PERMISSIONS } from "@/lib/permissions";
import { notifyUser } from "@/lib/notify";
import { logActivity } from "@/lib/activity";
import { refreshRating } from "@/lib/listings";
import { setSetting, SETTING_DEFAULTS, type SettingKey } from "@/lib/settings";
import { isFile, savePublicImage } from "@/lib/uploads";
import { slugify } from "@/lib/format";
import { KYC_LABELS } from "@/lib/constants";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const lines = (s: string) => s.split(/[\n,]/).map((x) => x.trim()).filter(Boolean).slice(0, 30);
const ok = (message?: string) => ({ ok: true as const, message });

// ───────────── Users ─────────────

export async function setUserStatusAction(userId: string, status: "ACTIVE" | "SUSPENDED" | "BANNED", reason?: string): Promise<ActionResult> {
  return safeAction(async () => {
    const admin = await assertAdmin("users");
    const u = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (u.isSuperAdmin) throw new UserError("Super admins can't be suspended.");
    if (u.id === admin.id) throw new UserError("You can't change your own status.");
    await prisma.user.update({ where: { id: userId }, data: { status, statusReason: reason || null } });
    if (status !== "ACTIVE") await destroyAllSessions(userId);
    await logActivity(admin.id, `user.${status.toLowerCase()}`, userId, reason);
    if (status !== "ACTIVE") {
      await notifyUser(u, { title: `Account ${status.toLowerCase()}`, body: `Your HomeVista Ke account has been ${status.toLowerCase()}.${reason ? ` Reason: ${reason}` : ""} Contact hello@homevista.co.ke if you believe this is a mistake.` });
    }
    revalidatePath("/admin/users");
    return ok(`User ${status.toLowerCase()}.`);
  });
}

export async function deleteUserAction(userId: string): Promise<ActionResult> {
  return safeAction(async () => {
    const admin = await assertAdmin("users");
    const u = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (u.isSuperAdmin || u.id === admin.id) throw new UserError("This account can't be deleted.");
    // Payments are financial records: keep them by refusing deletion of users who paid.
    const paid = await prisma.payment.count({ where: { userId, status: "SUCCESS" } });
    if (paid) throw new UserError("This user has payment records. Ban the account instead of deleting it.");
    await prisma.user.delete({ where: { id: userId } });
    await logActivity(admin.id, "user.deleted", userId, u.email);
    revalidatePath("/admin/users");
    return ok("User deleted.");
  });
}

// ───────────── KYC & badges ─────────────

export async function reviewKycAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const admin = await assertAdmin("kyc");
    const id = str(fd, "id");
    const decision = str(fd, "decision") as KycStatus;
    const note = str(fd, "note");
    if (!["UNDER_REVIEW", "APPROVED", "REJECTED", "RESUBMIT"].includes(decision)) throw new UserError("Choose a decision.");
    if ((decision === "REJECTED" || decision === "RESUBMIT") && note.length < 5) throw new UserError("Give the lister a reason so they can fix it.");
    const sub = await prisma.kycSubmission.findUniqueOrThrow({ where: { id }, include: { lister: { include: { user: true } } } });
    await prisma.$transaction([
      prisma.kycSubmission.update({ where: { id }, data: { status: decision, reviewNote: note || null, reviewedById: admin.id, reviewedAt: new Date() } }),
      prisma.listerProfile.update({
        where: { id: sub.listerId },
        data: {
          kycStatus: decision,
          ...(decision === "APPROVED" ? { verified: true, verifiedAt: new Date(), badgeRevokedReason: null } : {}),
          ...(decision === "REJECTED" || decision === "RESUBMIT" ? { verified: false } : {}),
        },
      }),
    ]);
    const u = sub.lister.user;
    const messages: Partial<Record<KycStatus, { title: string; body: string; sms?: string }>> = {
      UNDER_REVIEW: { title: "KYC under review", body: "A reviewer has started checking your documents." },
      APPROVED: {
        title: "You're verified! 🎉",
        body: "Your KYC is approved and your gold Verified badge is now live on your profile and listings. Verified listers rank higher in search.",
        sms: "HomeVista: your KYC is approved — your Verified badge is live.",
      },
      REJECTED: { title: "KYC rejected", body: `Your verification was rejected. Reason: ${note}. You can submit new documents from your dashboard.`, sms: "HomeVista: your KYC was rejected. See your dashboard for details." },
      RESUBMIT: { title: "KYC: resubmission required", body: `Please resubmit your documents. Reviewer note: ${note}`, sms: "HomeVista: please resubmit your KYC documents. See your dashboard." },
    };
    const m = messages[decision]!;
    await notifyUser(u, { ...m, link: "/lister/kyc", emailSubject: `Verification update: ${KYC_LABELS[decision]}` });
    await logActivity(admin.id, `kyc.${decision.toLowerCase()}`, id, note);
    revalidatePath("/admin/kyc");
    return ok(`Marked as ${KYC_LABELS[decision]}.`);
  });
}

export async function setBadgeAction(listerId: string, verified: boolean, reason?: string): Promise<ActionResult> {
  return safeAction(async () => {
    const admin = await assertAdmin("kyc");
    const l = await prisma.listerProfile.findUniqueOrThrow({ where: { id: listerId }, include: { user: true } });
    if (verified && l.kycStatus !== "APPROVED") throw new UserError("Approve their KYC first.");
    await prisma.listerProfile.update({ where: { id: listerId }, data: { verified, verifiedAt: verified ? new Date() : l.verifiedAt, badgeRevokedReason: verified ? null : reason || "Revoked by admin" } });
    if (!verified) await notifyUser(l.user, { title: "Verified badge removed", body: `Your Verified badge has been removed.${reason ? ` Reason: ${reason}` : ""} Contact us to appeal.`, link: "/lister/kyc" });
    await logActivity(admin.id, verified ? "badge.restored" : "badge.revoked", listerId, reason);
    revalidatePath("/admin/users");
    revalidatePath("/admin/kyc");
    return ok(verified ? "Badge restored." : "Badge revoked.");
  });
}

// ───────────── Listings & reports ─────────────

export async function moderateListingAction(id: string, action: "approve" | "reject" | "remove" | "pause" | "feature" | "unfeature", note?: string): Promise<ActionResult> {
  return safeAction(async () => {
    const admin = await assertAdmin("listings");
    const p = await prisma.property.findUniqueOrThrow({ where: { id }, include: { lister: { include: { user: true } } } });
    const data =
      action === "approve" ? { status: "ACTIVE" as const, statusNote: null, publishedAt: p.publishedAt ?? new Date() }
      : action === "reject" ? { status: "REJECTED" as const, statusNote: note || "Doesn't meet our listing guidelines." }
      : action === "remove" ? { status: "REMOVED" as const, statusNote: note || "Removed by moderator.", featured: false }
      : action === "pause" ? { status: "PAUSED" as const, statusNote: note || "Paused by moderator." }
      : action === "feature" ? { featured: true, featuredRank: 10 }
      : { featured: false, featuredRank: 0 };
    await prisma.property.update({ where: { id }, data });
    if (["approve", "reject", "remove", "pause"].includes(action)) {
      const verb = { approve: "approved and is live", reject: "was not approved", remove: "was removed", pause: "was paused by a moderator" }[action as "approve"];
      await notifyUser(p.lister.user, { title: `Listing ${action === "approve" ? "approved" : "update"}`, body: `"${p.title}" ${verb}.${note ? ` Note: ${note}` : ""}`, link: "/lister/listings" });
    }
    await logActivity(admin.id, `listing.${action}`, id, note);
    revalidatePath("/admin/listings");
    revalidatePath(`/properties/${p.slug}`);
    return ok();
  });
}

const adminListingSchema = z.object({
  id: z.string(),
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().min(20).max(8000),
  price: z.coerce.number().int().min(1),
  featuredRank: z.coerce.number().int().min(0).max(100),
  statusNote: z.string().trim().max(300).optional(),
});

export async function adminEditListingAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const admin = await assertAdmin("listings");
    const d = adminListingSchema.parse(Object.fromEntries(fd));
    const p = await prisma.property.update({
      where: { id: d.id },
      data: { title: d.title, description: d.description, price: d.price, featuredRank: d.featuredRank, featured: fd.get("featured") === "on", statusNote: d.statusNote || null },
    });
    await logActivity(admin.id, "listing.admin_edit", d.id);
    revalidatePath(`/properties/${p.slug}`);
    return ok("Listing updated.");
  });
}

export async function resolveReportAction(id: string, status: "RESOLVED" | "DISMISSED"): Promise<ActionResult> {
  return safeAction(async () => {
    const admin = await assertAdmin("listings");
    await prisma.report.update({ where: { id }, data: { status, resolvedAt: new Date() } });
    await logActivity(admin.id, `report.${status.toLowerCase()}`, id);
    revalidatePath("/admin/reports");
    return ok();
  });
}

// ───────────── Reviews ─────────────

export async function moderateReviewAction(id: string, action: "publish" | "hide" | "delete" | "unflag"): Promise<ActionResult> {
  return safeAction(async () => {
    const admin = await assertAdmin("reviews");
    const r = await prisma.review.findUniqueOrThrow({ where: { id } });
    if (action === "delete") await prisma.review.delete({ where: { id } });
    else await prisma.review.update({ where: { id }, data: action === "publish" ? { status: "PUBLISHED", flagged: false } : action === "hide" ? { status: "HIDDEN" } : { flagged: false } });
    if (action !== "unflag") await prisma.report.updateMany({ where: { reviewId: id, status: "OPEN" }, data: { status: "RESOLVED", resolvedAt: new Date() } }).catch(() => {});
    await refreshRating(r.propertyId);
    await logActivity(admin.id, `review.${action}`, id);
    revalidatePath("/admin/reviews");
    return ok();
  });
}

// ───────────── Adverts ─────────────

/** <input type="datetime-local"> has no zone: interpret it as Nairobi time (UTC+3). */
const nairobiDate = z.preprocess(
  (v) => (typeof v === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(v) ? new Date(`${v}:00+03:00`) : v),
  z.coerce.date({ invalid_type_error: "Enter a valid date." }),
);

const advertSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(3).max(100),
  subtitle: z.string().trim().max(160).optional(),
  linkUrl: z.string().trim().refine((u) => /^https?:\/\//.test(u) || u.startsWith("/"), "Link must start with https:// or /"),
  placement: z.enum(["HOME_HERO", "SIDEBAR", "BETWEEN_LISTINGS", "FOOTER"]),
  startsAt: nairobiDate,
  endsAt: nairobiDate,
  imageUrl: z.string().trim().optional(),
});

export async function saveAdvertAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const admin = await assertAdmin("adverts");
    const d = advertSchema.parse(Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string")));
    if (d.endsAt <= d.startsAt) throw new UserError("End date must be after the start date.");
    const file = fd.get("image");
    const imageUrl = isFile(file) ? await savePublicImage(file, "ads", { maxWidth: 2400 }) : d.imageUrl;
    if (!imageUrl) throw new UserError("Upload a banner image.");
    const data = { title: d.title, subtitle: d.subtitle || null, linkUrl: d.linkUrl, placement: d.placement as AdPlacement, startsAt: d.startsAt, endsAt: d.endsAt, imageUrl, active: fd.get("active") === "on" };
    if (d.id) await prisma.advert.update({ where: { id: d.id }, data });
    else await prisma.advert.create({ data });
    await logActivity(admin.id, d.id ? "advert.updated" : "advert.created", d.id ?? d.title);
    revalidatePath("/admin/adverts");
    return ok("Advert saved.");
  });
}

export async function advertToggleAction(id: string, action: "toggle" | "delete"): Promise<ActionResult> {
  return safeAction(async () => {
    const admin = await assertAdmin("adverts");
    if (action === "delete") await prisma.advert.delete({ where: { id } });
    else {
      const a = await prisma.advert.findUniqueOrThrow({ where: { id } });
      await prisma.advert.update({ where: { id }, data: { active: !a.active } });
    }
    await logActivity(admin.id, `advert.${action}`, id);
    revalidatePath("/admin/adverts");
    return ok();
  });
}

// ───────────── Companies & realtors ─────────────

export async function saveCompanyAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const res = await safeAction(async () => {
    const admin = await assertAdmin("directory");
    const id = str(fd, "id");
    const name = str(fd, "name");
    if (name.length < 2) throw new UserError("Enter the company name.");
    const description = str(fd, "description");
    if (description.length < 20) throw new UserError("Add a description (20+ characters).");
    const website = str(fd, "website");
    if (website && !/^https?:\/\//.test(website)) throw new UserError("Website must start with https://");
    const logo = fd.get("logo");
    const cover = fd.get("cover");
    const year = parseInt(str(fd, "foundedYear"), 10);
    const data = {
      name,
      description,
      phone: str(fd, "phone") || null,
      email: str(fd, "email") || null,
      website: website || null,
      address: str(fd, "address") || null,
      areasServed: lines(str(fd, "areasServed")),
      verified: fd.get("verified") === "on",
      featured: fd.get("featured") === "on",
      foundedYear: Number.isFinite(year) ? year : null,
      ...(isFile(logo) ? { logoUrl: await savePublicImage(logo, "companies", { maxWidth: 400, maxHeight: 400 }) } : {}),
      ...(isFile(cover) ? { coverUrl: await savePublicImage(cover, "companies") } : {}),
    };
    if (id) await prisma.company.update({ where: { id }, data });
    else await prisma.company.create({ data: { ...data, slug: await uniqueSlug("company", name) } });
    await logActivity(admin.id, id ? "company.updated" : "company.created", id || name);
    revalidatePath("/admin/companies");
    revalidatePath("/companies");
    return ok("Company saved.");
  });
  if (res.ok) redirect("/admin/companies?saved=1");
  return res;
}

export async function saveRealtorAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const res = await safeAction(async () => {
    const admin = await assertAdmin("directory");
    const id = str(fd, "id");
    const name = str(fd, "name");
    if (name.length < 2) throw new UserError("Enter the realtor's name.");
    const bio = str(fd, "bio");
    if (bio.length < 20) throw new UserError("Add a short bio (20+ characters).");
    const photo = fd.get("photo");
    const rating = parseFloat(str(fd, "rating"));
    const years = parseInt(str(fd, "yearsExperience"), 10);
    const listerId = str(fd, "listerId") || null;
    const data = {
      name,
      bio,
      companyId: str(fd, "companyId") || null,
      listerId,
      phone: str(fd, "phone") || null,
      email: str(fd, "email") || null,
      specialties: lines(str(fd, "specialties")),
      areas: lines(str(fd, "areas")),
      earbNumber: str(fd, "earbNumber") || null,
      yearsExperience: Number.isFinite(years) ? years : null,
      rating: Number.isFinite(rating) ? Math.min(5, Math.max(0, rating)) : 0,
      verified: fd.get("verified") === "on",
      featured: fd.get("featured") === "on",
      ...(isFile(photo) ? { photoUrl: await savePublicImage(photo, "realtors", { maxWidth: 800, maxHeight: 800 }) } : {}),
    };
    if (listerId) {
      const clash = await prisma.realtor.findFirst({ where: { listerId, ...(id ? { id: { not: id } } : {}) } });
      if (clash) throw new UserError("That lister account is already linked to another realtor profile.");
    }
    if (id) await prisma.realtor.update({ where: { id }, data });
    else await prisma.realtor.create({ data: { ...data, slug: await uniqueSlug("realtor", name) } });
    await logActivity(admin.id, id ? "realtor.updated" : "realtor.created", id || name);
    revalidatePath("/admin/realtors");
    revalidatePath("/realtors");
    return ok("Realtor saved.");
  });
  if (res.ok) redirect("/admin/realtors?saved=1");
  return res;
}

export async function deleteDirectoryAction(kind: "company" | "realtor", id: string): Promise<ActionResult> {
  return safeAction(async () => {
    const admin = await assertAdmin("directory");
    if (kind === "company") await prisma.company.delete({ where: { id } });
    else await prisma.realtor.delete({ where: { id } });
    await logActivity(admin.id, `${kind}.deleted`, id);
    revalidatePath(kind === "company" ? "/admin/companies" : "/admin/realtors");
    return ok();
  });
}

async function uniqueSlug(kind: "company" | "realtor" | "blog", name: string) {
  const base = slugify(name) || kind;
  for (let i = 0; i < 50; i++) {
    const slug = i ? `${base}-${i + 1}` : base;
    const exists =
      kind === "company" ? await prisma.company.findUnique({ where: { slug } })
      : kind === "realtor" ? await prisma.realtor.findUnique({ where: { slug } })
      : await prisma.blogPost.findUnique({ where: { slug } });
    if (!exists) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

// ───────────── Taxonomy ─────────────

type TaxKind = "type" | "amenity" | "category" | "county" | "town";

export async function saveTaxonomyAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const admin = await assertAdmin("taxonomy");
    const kind = str(fd, "kind") as TaxKind;
    const id = str(fd, "id");
    const name = str(fd, "name");
    if (name.length < 2) throw new UserError("Enter a name.");
    const slug = slugify(name);
    const icon = str(fd, "icon") || undefined;
    const sortOrder = parseInt(str(fd, "sortOrder"), 10) || 0;
    const active = fd.get("active") !== null ? fd.get("active") === "on" : true;
    const lat = parseFloat(str(fd, "lat"));
    const lng = parseFloat(str(fd, "lng"));
    const needCoords = () => {
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new UserError("Enter latitude and longitude (e.g. -1.2864, 36.8172).");
    };
    try {
      switch (kind) {
        case "type":
          if (id) await prisma.propertyType.update({ where: { id }, data: { name, slug, icon, sortOrder, active } });
          else await prisma.propertyType.create({ data: { name, slug, icon, sortOrder } });
          break;
        case "amenity":
          if (id) await prisma.amenity.update({ where: { id }, data: { name, slug, icon, sortOrder, active } });
          else await prisma.amenity.create({ data: { name, slug, icon, sortOrder } });
          break;
        case "category": {
          const image = fd.get("image");
          const imageUrl = isFile(image) ? await savePublicImage(image, "categories", { maxWidth: 1200 }) : undefined;
          const data = { name, slug, description: str(fd, "description") || null, sortOrder, active, ...(imageUrl ? { imageUrl } : {}) };
          if (id) await prisma.category.update({ where: { id }, data });
          else await prisma.category.create({ data });
          break;
        }
        case "county":
          needCoords();
          if (id) await prisma.county.update({ where: { id }, data: { name, slug, lat, lng, popular: fd.get("popular") === "on" } });
          else await prisma.county.create({ data: { name, slug, lat, lng, popular: fd.get("popular") === "on" } });
          break;
        case "town": {
          needCoords();
          const countyId = str(fd, "countyId");
          if (!countyId) throw new UserError("Choose a county.");
          if (id) await prisma.town.update({ where: { id }, data: { name, slug, lat, lng, countyId } });
          else await prisma.town.create({ data: { name, slug, lat, lng, countyId } });
          break;
        }
        default:
          throw new UserError("Unknown type.");
      }
    } catch (e) {
      if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002") throw new UserError(`"${name}" already exists.`);
      throw e;
    }
    await logActivity(admin.id, `taxonomy.${kind}.saved`, id || name);
    revalidatePath("/admin/taxonomy");
    return ok("Saved.");
  });
}

export async function deleteTaxonomyAction(kind: TaxKind, id: string): Promise<ActionResult> {
  return safeAction(async () => {
    const admin = await assertAdmin("taxonomy");
    const inUse =
      kind === "type" ? await prisma.property.count({ where: { typeId: id } })
      : kind === "county" ? await prisma.property.count({ where: { countyId: id } })
      : kind === "town" ? await prisma.property.count({ where: { townId: id } })
      : 0;
    if (inUse) throw new UserError(`In use by ${inUse} listing(s). Deactivate or reassign them first.`);
    if (kind === "type") await prisma.propertyType.delete({ where: { id } });
    if (kind === "amenity") await prisma.amenity.delete({ where: { id } });
    if (kind === "category") await prisma.category.delete({ where: { id } });
    if (kind === "county") await prisma.county.delete({ where: { id } });
    if (kind === "town") await prisma.town.delete({ where: { id } });
    await logActivity(admin.id, `taxonomy.${kind}.deleted`, id);
    revalidatePath("/admin/taxonomy");
    return ok();
  });
}

// ───────────── Content ─────────────

export async function saveBlogPostAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const res = await safeAction(async () => {
    const admin = await assertAdmin("content");
    const id = str(fd, "id");
    const title = str(fd, "title");
    const body = str(fd, "body");
    if (title.length < 5) throw new UserError("Enter a title.");
    if (body.length < 50) throw new UserError("The article body is too short.");
    const cover = fd.get("cover");
    const published = fd.get("published") === "on";
    const existing = id ? await prisma.blogPost.findUnique({ where: { id } }) : null;
    const data = {
      title,
      excerpt: str(fd, "excerpt") || body.slice(0, 180),
      body,
      author: str(fd, "author") || "HomeVista Editorial",
      tags: lines(str(fd, "tags")),
      published,
      publishedAt: published ? (existing?.publishedAt ?? new Date()) : null,
      ...(isFile(cover) ? { coverUrl: await savePublicImage(cover, "blog") } : {}),
    };
    if (id) await prisma.blogPost.update({ where: { id }, data });
    else await prisma.blogPost.create({ data: { ...data, slug: await uniqueSlug("blog", title) } });
    await logActivity(admin.id, id ? "blog.updated" : "blog.created", id || title);
    revalidatePath("/blog");
    revalidatePath("/admin/content");
    return ok();
  });
  if (res.ok) redirect("/admin/content?saved=1");
  return res;
}

export async function saveFaqAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const admin = await assertAdmin("content");
    const id = str(fd, "id");
    const data = { question: str(fd, "question"), answer: str(fd, "answer"), group: str(fd, "group") || "General", sortOrder: parseInt(str(fd, "sortOrder"), 10) || 0 };
    if (data.question.length < 5 || data.answer.length < 5) throw new UserError("Enter a question and an answer.");
    if (id) await prisma.faq.update({ where: { id }, data });
    else await prisma.faq.create({ data });
    await logActivity(admin.id, "faq.saved", id || data.question);
    revalidatePath("/faq");
    revalidatePath("/admin/content");
    return ok("FAQ saved.");
  });
}

export async function savePageAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const admin = await assertAdmin("content");
    const slug = str(fd, "slug");
    if (!["terms", "privacy", "about"].includes(slug)) throw new UserError("Unknown page.");
    await prisma.page.upsert({ where: { slug }, create: { slug, title: str(fd, "title"), body: str(fd, "body") }, update: { title: str(fd, "title"), body: str(fd, "body") } });
    await logActivity(admin.id, "page.saved", slug);
    revalidatePath(`/${slug}`);
    return ok("Page saved.");
  });
}

export async function saveTestimonialAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const admin = await assertAdmin("content");
    const id = str(fd, "id");
    const avatar = fd.get("avatar");
    const data = {
      name: str(fd, "name"),
      role: str(fd, "role"),
      quote: str(fd, "quote"),
      sortOrder: parseInt(str(fd, "sortOrder"), 10) || 0,
      active: fd.get("active") === "on",
      ...(isFile(avatar) ? { avatarUrl: await savePublicImage(avatar, "testimonials", { maxWidth: 300, maxHeight: 300 }) } : {}),
    };
    if (data.name.length < 2 || data.quote.length < 10) throw new UserError("Enter a name and a quote.");
    if (id) await prisma.testimonial.update({ where: { id }, data });
    else await prisma.testimonial.create({ data });
    await logActivity(admin.id, "testimonial.saved", id || data.name);
    revalidatePath("/");
    revalidatePath("/admin/content");
    return ok("Testimonial saved.");
  });
}

export async function deleteContentAction(kind: "blog" | "faq" | "testimonial", id: string): Promise<ActionResult> {
  return safeAction(async () => {
    const admin = await assertAdmin("content");
    if (kind === "blog") await prisma.blogPost.delete({ where: { id } });
    if (kind === "faq") await prisma.faq.delete({ where: { id } });
    if (kind === "testimonial") await prisma.testimonial.delete({ where: { id } });
    await logActivity(admin.id, `${kind}.deleted`, id);
    revalidatePath("/admin/content");
    return ok();
  });
}

// ───────────── Settings & staff ─────────────

export async function saveSettingsAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const admin = await assertAdmin("settings");
    const num = (k: string, min: number, max: number, label: string) => {
      const n = parseInt(str(fd, k), 10);
      if (!Number.isFinite(n) || n < min || n > max) throw new UserError(`${label} must be between ${min} and ${max}.`);
      return String(n);
    };
    const values: Partial<Record<SettingKey, string>> = {
      unlock_price: num("unlock_price", 1, 100_000, "Unlock price"),
      subscription_price: num("subscription_price", 1, 1_000_000, "Subscription price"),
      subscription_days: num("subscription_days", 1, 366, "Subscription length"),
      require_listing_approval: fd.get("require_listing_approval") === "on" ? "true" : "false",
      auto_publish_verified: fd.get("auto_publish_verified") === "on" ? "true" : "false",
      review_moderation: fd.get("review_moderation") === "on" ? "true" : "false",
      reminder_days: str(fd, "reminder_days").replace(/[^\d,]/g, "") || SETTING_DEFAULTS.reminder_days,
      site_notice: str(fd, "site_notice").slice(0, 300),
    };
    for (const [k, v] of Object.entries(values)) await setSetting(k as SettingKey, v!);
    await logActivity(admin.id, "settings.updated", null, JSON.stringify(values));
    revalidatePath("/", "layout");
    return ok("Settings saved. New prices apply to payments started from now on.");
  });
}

export async function saveStaffAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const admin = await assertAdmin("staff");
    const email = str(fd, "email").toLowerCase();
    const perms = fd.getAll("permissions").map(String).filter((p) => (ALL_ADMIN_PERMISSIONS as string[]).includes(p) && p !== "staff");
    const u = await prisma.user.findUnique({ where: { email } });
    if (!u) throw new UserError("No account with that email. Ask them to register first.");
    if (u.isSuperAdmin) throw new UserError("That's a super admin.");
    if (u.role === "LISTER") throw new UserError("Lister accounts can't be made admins. Use a separate account.");
    await prisma.user.update({ where: { id: u.id }, data: { role: perms.length ? "ADMIN" : "USER", adminPermissions: perms } });
    await destroyAllSessions(u.id);
    await logActivity(admin.id, perms.length ? "staff.saved" : "staff.removed", u.id, perms.join(","));
    revalidatePath("/admin/staff");
    return ok(perms.length ? `${u.name} is now a staff admin.` : `${u.name}'s admin access was removed.`);
  });
}
