import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Frequently Asked Questions", description: "How unlocking, M-Pesa payments, lister subscriptions and verification work on HomeVista Ke." };

export default async function FaqPage() {
  const faqs = await prisma.faq.findMany({ orderBy: [{ sortOrder: "asc" }] });
  const groups = [...new Set(faqs.map((f) => f.group))];
  const jsonLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })) };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <PageHeader eyebrow="Help centre" title="Frequently asked questions" intro="Everything about browsing, unlocking, payments and listing on HomeVista Ke." />
      <div className="container-x max-w-3xl py-12">
        {groups.map((g) => (
          <section key={g} className="mb-10">
            <h2 className="mb-4 text-2xl">{g}</h2>
            <div className="card divide-y divide-line">
              {faqs.filter((f) => f.group === g).map((f) => (
                <details key={f.id} className="group px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-ink [&::-webkit-details-marker]:hidden">
                    {f.question}
                    <ChevronDown size={18} className="shrink-0 text-gold-deep transition group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-ink-2">{f.answer}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
        <p className="text-center text-sm text-ink-2">Still have a question? <Link href="/contact" className="link">Contact our team</Link>.</p>
      </div>
    </>
  );
}
