import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasAdminPermission } from "@/lib/permissions";
import { paymentWhere } from "@/lib/payment-filters";
import { tablePdf } from "@/lib/pdf";
import { PAYMENT_STATUS_LABELS } from "@/lib/constants";
import { dateTimeLabel, kes } from "@/lib/format";
import { logActivity } from "@/lib/activity";

/** Neutralises spreadsheet formula injection (=, +, -, @) and quotes CSV cells. */
function csvCell(v: unknown) {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(req: Request) {
  const user = await getUser();
  if (!user || !hasAdminPermission(user, "payments")) return new Response("Not found", { status: 404 });
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const where = paymentWhere(sp);
  const rows = await prisma.payment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 20_000,
    include: { user: { select: { name: true, email: true } }, property: { select: { title: true } } },
  });
  await logActivity(user.id, "payments.exported", sp.format ?? "csv", `${rows.length} rows`);
  const stamp = new Date().toISOString().slice(0, 10);

  if (sp.format === "pdf") {
    const total = rows.filter((r) => r.status === "SUCCESS").reduce((a, r) => a + r.amount, 0);
    const bytes = await tablePdf(
      "HomeVista Ke - Payments report",
      `Generated ${dateTimeLabel(new Date())} - ${rows.length} transactions - collected ${kes(total)}`,
      ["Date", "Reference", "Type", "Customer", "Phone", "Amount", "M-Pesa", "Status", "Item"],
      rows.map((r) => [
        dateTimeLabel(r.createdAt),
        r.reference,
        r.kind === "UNLOCK" ? "Unlock" : "Subscription",
        r.user.name,
        r.phone,
        kes(r.amount),
        r.mpesaReceipt ?? "-",
        PAYMENT_STATUS_LABELS[r.status] ?? r.status,
        r.property?.title ?? (r.kind === "SUBSCRIPTION" ? "Lister subscription" : "-"),
      ]),
      [92, 62, 62, 100, 78, 62, 74, 58, 194],
    );
    return new Response(Buffer.from(bytes), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="homevista-payments-${stamp}.pdf"`, "Cache-Control": "no-store" },
    });
  }

  const header = ["created_at", "completed_at", "reference", "type", "status", "amount_kes", "mpesa_receipt", "phone", "customer_name", "customer_email", "property", "result"];
  const lines = [header.join(",")].concat(
    rows.map((r) =>
      [r.createdAt.toISOString(), r.completedAt?.toISOString() ?? "", r.reference, r.kind, r.status, r.amount, r.mpesaReceipt ?? "", r.phone, r.user.name, r.user.email, r.property?.title ?? "", r.resultDesc ?? ""]
        .map(csvCell)
        .join(","),
    ),
  );
  return new Response("﻿" + lines.join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="homevista-payments-${stamp}.csv"`, "Cache-Control": "no-store" },
  });
}
