import Link from "next/link";
import { Star } from "lucide-react";
import { requireLister } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { timeAgo } from "@/lib/format";
import { DashHeader } from "@/components/DashShell";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Avatar, EmptyState, Stars } from "@/components/ui";
import { replyReviewAction } from "@/app/actions/lister";

export default async function ListerReviewsPage() {
  const user = await requireLister();
  const reviews = await prisma.review.findMany({
    where: { property: { listerId: user.listerId }, status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { name: true, avatarUrl: true } }, property: { select: { title: true, slug: true } } },
  });
  return (
    <>
      <DashHeader title="Reviews" intro="Reply publicly to show seekers you care. Replies appear under the review on your listing." />
      {reviews.length ? (
        <ul className="space-y-4">
          {reviews.map((r) => (
            <li key={r.id} className="card p-5">
              <div className="flex items-start gap-3">
                <Avatar name={r.user.name} src={r.user.avatarUrl} size={38} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{r.user.name} <span className="font-normal text-muted">· {timeAgo(r.createdAt)}</span></p>
                  <Link href={`/properties/${r.property.slug}#reviews`} className="block truncate text-xs text-muted hover:text-gold-deep">{r.property.title}</Link>
                  <Stars value={r.rating} size={13} className="mt-1" />
                  <p className="mt-2 text-sm text-ink-2">{r.comment}</p>
                  <ActionForm action={replyReviewAction} className="mt-3 space-y-2">
                    <input type="hidden" name="reviewId" value={r.id} />
                    <textarea name="reply" rows={2} maxLength={1000} defaultValue={r.reply ?? ""} placeholder="Write a public reply…" className="input" />
                    <SubmitButton className="btn-primary btn-sm">{r.reply ? "Update reply" : "Reply"}</SubmitButton>
                  </ActionForm>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<Star size={24} />} title="No reviews yet" body="Reviews from seekers will appear here." />
      )}
    </>
  );
}
