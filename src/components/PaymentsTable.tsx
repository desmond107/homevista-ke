import Link from "next/link";
import { Download } from "lucide-react";
import { PAYMENT_STATUS_LABELS } from "@/lib/constants";
import { dateTimeLabel, kes, maskPhone } from "@/lib/format";
import { Pill, statusTone } from "./ui";

type Row = {
  id: string;
  reference: string;
  kind: string;
  amount: number;
  phone: string;
  status: string;
  mpesaReceipt: string | null;
  resultDesc: string | null;
  createdAt: Date;
  property?: { title: string; slug: string } | null;
  user?: { name: string; email: string } | null;
};

export function PaymentsTable({ rows, showUser }: { rows: Row[]; showUser?: boolean }) {
  return (
    <div className="card overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>Date</th>
            {showUser && <th>Customer</th>}
            <th>Description</th>
            <th>Amount</th>
            <th>M-Pesa</th>
            <th>Status</th>
            <th className="text-right">Receipt</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id}>
              <td className="whitespace-nowrap text-ink-2">{dateTimeLabel(p.createdAt)}</td>
              {showUser && (
                <td>
                  <span className="block text-ink">{p.user?.name}</span>
                  <span className="block text-xs text-muted">{p.user?.email}</span>
                </td>
              )}
              <td className="max-w-xs">
                <span className="block text-ink">{p.kind === "UNLOCK" ? "Property unlock" : "Lister subscription"}</span>
                {p.property && (
                  <Link href={`/properties/${p.property.slug}`} className="block truncate text-xs text-muted hover:text-gold-deep">
                    {p.property.title}
                  </Link>
                )}
                <span className="block text-xs text-muted">Ref {p.reference}</span>
              </td>
              <td className="font-medium whitespace-nowrap">{kes(p.amount)}</td>
              <td className="text-xs whitespace-nowrap text-ink-2">
                {p.mpesaReceipt ?? "—"}
                <span className="block text-muted">{maskPhone(p.phone)}</span>
              </td>
              <td>
                <Pill tone={statusTone(p.status)}>{PAYMENT_STATUS_LABELS[p.status]}</Pill>
                {p.status !== "SUCCESS" && p.resultDesc && <span className="mt-1 block max-w-[200px] text-[11px] text-muted">{p.resultDesc}</span>}
              </td>
              <td className="text-right">
                {p.status === "SUCCESS" && (
                  <a href={`/api/payments/${p.id}/receipt`} className="btn-ghost btn-sm" aria-label={`Download receipt ${p.reference}`}>
                    <Download size={14} /> PDF
                  </a>
                )}
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={showUser ? 7 : 6} className="py-10 text-center text-muted">
                No payments yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
