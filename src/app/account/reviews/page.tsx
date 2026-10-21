import Link from "next/link";
import { Star } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { timeAgo } from "@/lib/format";
import { DashHeader } from "@/components/DashShell";
import { DeleteReviewButton } from "@/components/reviews";
import { EmptyState, Pill, Stars } from "@/components/ui";

export default async function MyReviewsPage() {
  const user = await requireUser("/account/reviews");
  const reviews = await prisma.review.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { property: { select: { title: true, slug: true } } } });
  return (
    <>
      <DashHeader title="My reviews" intro="Edit a review from the property page. You can leave one review per property." />
      {reviews.length ? (
        <ul className="space-y-4">
          {reviews.map((r) => (
            <li key={r.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <Link href={`/properties/${r.property.slug}#reviews`} className="font-serif text-lg text-ink hover:text-gold-deep">
                  {r.property.title}
                </Link>
                {r.status !== "PUBLISHED" && <Pill tone="warning">{r.status === "PENDING" ? "Awaiting moderation" : "Hidden by moderator"}</Pill>}
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                <Stars value={r.rating} size={13} /> {timeAgo(r.createdAt)}
              </div>
              <p className="mt-2 text-sm text-ink-2">{r.comment}</p>
              {r.reply && <p className="mt-3 rounded-xl border-l-2 border-gold bg-bg-alt px-3 py-2 text-sm text-ink-2"><strong className="text-ink">Lister reply:</strong> {r.reply}</p>}
              <div className="mt-3 flex gap-4">
                <Link href={`/properties/${r.property.slug}#reviews`} className="link text-xs">
                  Edit
                </Link>
                <DeleteReviewButton reviewId={r.id} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<Star size={24} />} title="No reviews yet" body="Viewed a property? Share your experience to help other seekers." />
      )}
    </>
  );
}
