import Image from "next/image";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AD_PLACEMENT_LABELS } from "@/lib/constants";
import { dateLabel } from "@/lib/format";
import { DashHeader } from "@/components/DashShell";
import { ActButton } from "@/components/admin/ActButton";
import { Pill } from "@/components/ui";
import { advertToggleAction } from "@/app/actions/admin";
import { AdvertForm } from "./AdvertForm";

export default async function AdvertsPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  await requireAdmin("adverts");
  const sp = await searchParams;
  const ads = await prisma.advert.findMany({ orderBy: [{ active: "desc" }, { endsAt: "desc" }] });
  const editing = sp.edit ? ads.find((a) => a.id === sp.edit) : null;
  const now = new Date();
  const toLocal = (d: Date) => new Date(d.getTime() + 3 * 3600_000).toISOString().slice(0, 16);
  return (
    <>
      <DashHeader title="Ads & adverts" intro="Banners for the homepage hero, search sidebar, between listings and the footer. Impressions and clicks are tracked automatically." />
      <div className="grid gap-6 2xl:grid-cols-[1.4fr_1fr]">
        <div className="card overflow-x-auto">
          <table className="table table-stack">
            <thead><tr><th>Advert</th><th>Placement</th><th>Schedule</th><th className="text-right">Impr.</th><th className="text-right">Clicks</th><th className="text-right">CTR</th><th /></tr></thead>
            <tbody>
              {ads.map((a) => {
                const live = a.active && a.startsAt <= now && a.endsAt >= now;
                return (
                  <tr key={a.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-bg-alt"><Image src={a.imageUrl} alt="" fill sizes="80px" className="object-cover" /></span>
                        <span className="min-w-0"><span className="block font-medium text-ink">{a.title}</span><span className="block max-w-[180px] truncate text-xs text-muted sm:max-w-[200px]">{a.linkUrl}</span></span>
                      </div>
                    </td>
                    <td data-label="Placement" className="stack-inline text-xs">{AD_PLACEMENT_LABELS[a.placement]}</td>
                    <td data-label="Schedule" className="stack-inline text-xs text-ink-2">{dateLabel(a.startsAt)} → {dateLabel(a.endsAt)}<span className="mt-1 block"><Pill tone={live ? "success" : a.active ? "warning" : "neutral"}>{live ? "Live" : a.active ? (a.endsAt < now ? "Ended" : "Scheduled") : "Inactive"}</Pill></span></td>
                    <td data-label="Impr." className="stack-inline text-right">{a.impressions.toLocaleString()}</td>
                    <td data-label="Clicks" className="stack-inline text-right">{a.clicks.toLocaleString()}</td>
                    <td data-label="CTR" className="stack-inline text-right">{a.impressions ? ((a.clicks / a.impressions) * 100).toFixed(2) : "0.00"}%</td>
                    <td>
                      <div className="flex justify-end gap-1.5">
                        <Link href={`/admin/adverts?edit=${a.id}`} className="btn-outline btn-sm">Edit</Link>
                        <ActButton action={advertToggleAction.bind(null, a.id, "toggle")}>{a.active ? "Deactivate" : "Activate"}</ActButton>
                        <ActButton action={advertToggleAction.bind(null, a.id, "delete")} confirm="Delete this advert?" className="btn-ghost btn-sm text-danger">Delete</ActButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <AdvertForm
          key={editing?.id ?? "new"}
          initial={
            editing
              ? { id: editing.id, title: editing.title, subtitle: editing.subtitle ?? "", linkUrl: editing.linkUrl, placement: editing.placement, startsAt: toLocal(editing.startsAt), endsAt: toLocal(editing.endsAt), imageUrl: editing.imageUrl, active: editing.active }
              : null
          }
        />
      </div>
    </>
  );
}
