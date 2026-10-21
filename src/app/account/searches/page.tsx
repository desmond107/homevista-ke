import Link from "next/link";
import { Search } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildWhere, parseFilters } from "@/lib/search";
import { dateLabel } from "@/lib/format";
import { DashHeader } from "@/components/DashShell";
import { EmptyState } from "@/components/ui";
import { SavedSearchControls } from "./SavedSearchControls";

export default async function SavedSearchesPage() {
  const user = await requireUser("/account/searches");
  const searches = await prisma.savedSearch.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  const counts = await Promise.all(searches.map((s) => prisma.property.count({ where: buildWhere(parseFilters(Object.fromEntries(new URLSearchParams(s.query)))) })));
  return (
    <>
      <DashHeader title="Saved searches" intro="We'll email you (at most daily) when new listings match a search with alerts on." />
      {searches.length ? (
        <ul className="space-y-3">
          {searches.map((s, i) => (
            <li key={s.id} className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Link href={`/properties?${s.query}`} className="font-medium text-ink hover:text-gold-deep">
                  {s.name}
                </Link>
                <p className="text-xs text-muted">
                  {counts[i]} matching now · saved {dateLabel(s.createdAt)}
                </p>
              </div>
              <SavedSearchControls id={s.id} alerts={s.alerts} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<Search size={24} />} title="No saved searches" body="Run a search and tap “Save search” to get alerts for new matching homes." action={<Link href="/properties" className="btn-primary">Start searching</Link>} />
      )}
    </>
  );
}
