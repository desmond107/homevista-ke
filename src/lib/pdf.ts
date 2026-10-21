import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { BRAND, PAYMENT_STATUS_LABELS } from "./constants";
import { dateTimeLabel, kes } from "./format";

const NAVY = rgb(0.047, 0.102, 0.18);
const GOLD = rgb(0.72, 0.58, 0.33);
const INK = rgb(0.11, 0.14, 0.2);
const MUTED = rgb(0.45, 0.47, 0.52);

// Standard PDF fonts are WinAnsi-only: keep text to that range.
const ascii = (s: string) => s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[—–]/g, "-").replace(/[^\x20-\x7E]/g, "");

type ReceiptData = {
  reference: string;
  kind: string;
  amount: number;
  status: string;
  phone: string;
  receipt: string | null;
  createdAt: Date;
  completedAt: Date | null;
  customer: { name: string; email: string };
  item: string;
};

export async function receiptPdf(r: ReceiptData) {
  const doc = await PDFDocument.create();
  doc.setTitle(`HomeVista Ke receipt ${r.reference}`);
  const page = doc.addPage([420, 595]);
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();

  page.drawRectangle({ x: 0, y: height - 90, width, height: 90, color: NAVY });
  page.drawText("HomeVista", { x: 32, y: height - 52, size: 24, font: serif, color: GOLD });
  page.drawText("Ke", { x: 32 + serif.widthOfTextAtSize("HomeVista ", 24), y: height - 52, size: 24, font: serif, color: rgb(1, 1, 1) });
  page.drawText(ascii(BRAND.tagline), { x: 32, y: height - 72, size: 9, font: sans, color: rgb(0.85, 0.8, 0.7) });
  page.drawText("RECEIPT", { x: width - 32 - bold.widthOfTextAtSize("RECEIPT", 11), y: height - 52, size: 11, font: bold, color: GOLD });

  let y = height - 130;
  page.drawText(kes(r.amount).replace("KSh", "KSh"), { x: 32, y, size: 28, font: serif, color: INK });
  y -= 20;
  page.drawText(PAYMENT_STATUS_LABELS[r.status] ?? r.status, { x: 32, y, size: 10, font: bold, color: r.status === "SUCCESS" ? rgb(0.15, 0.5, 0.3) : MUTED });
  y -= 30;

  const rows: [string, string][] = [
    ["Receipt no.", r.reference],
    ["M-Pesa reference", r.receipt ?? "-"],
    ["Description", r.kind === "UNLOCK" ? "Property unlock" : "Lister subscription"],
    ["Item", r.item],
    ["Paid by", r.customer.name],
    ["Email", r.customer.email],
    ["M-Pesa number", `+${r.phone}`],
    ["Initiated", dateTimeLabel(r.createdAt)],
    ["Completed", dateTimeLabel(r.completedAt)],
  ];
  for (const [k, v] of rows) {
    page.drawText(k, { x: 32, y, size: 9, font: sans, color: MUTED });
    y = drawWrapped(page, ascii(v), 150, y, 238, sans, 10, INK);
    y -= 12;
    page.drawLine({ start: { x: 32, y: y + 5 }, end: { x: width - 32, y: y + 5 }, thickness: 0.4, color: rgb(0.9, 0.88, 0.84) });
    y -= 6;
  }

  page.drawText(ascii(`${BRAND.name} - ${BRAND.address}`), { x: 32, y: 52, size: 8, font: sans, color: MUTED });
  page.drawText(ascii(`${BRAND.email} - ${BRAND.phone}`), { x: 32, y: 40, size: 8, font: sans, color: MUTED });
  page.drawText("This receipt was generated electronically and is valid without a signature.", { x: 32, y: 28, size: 7, font: sans, color: MUTED });
  return doc.save();
}

function drawWrapped(page: PDFPage, text: string, x: number, y: number, maxW: number, font: PDFFont, size: number, color: ReturnType<typeof rgb>) {
  const words = text.split(" ");
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > maxW && line) {
      page.drawText(line, { x, y, size, font, color });
      y -= size + 3;
      line = w;
    } else line = test;
  }
  if (line) page.drawText(line, { x, y, size, font, color });
  return y;
}

/** A simple tabular PDF report (payments export). */
export async function tablePdf(title: string, subtitle: string, headers: string[], rows: string[][], colWidths: number[]) {
  const doc = await PDFDocument.create();
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const W = 842;
  const H = 595; // A4 landscape
  let page = doc.addPage([W, H]);
  let y = H - 40;
  const header = () => {
    page.drawText(ascii(title), { x: 30, y, size: 18, font: serif, color: NAVY });
    y -= 16;
    page.drawText(ascii(subtitle), { x: 30, y, size: 9, font: sans, color: MUTED });
    y -= 22;
    let x = 30;
    headers.forEach((h, i) => {
      page.drawText(h, { x, y, size: 8, font: bold, color: GOLD });
      x += colWidths[i]!;
    });
    y -= 14;
  };
  header();
  for (const r of rows) {
    if (y < 40) {
      page = doc.addPage([W, H]);
      y = H - 40;
      header();
    }
    let x = 30;
    r.forEach((c, i) => {
      let s = ascii(c);
      while (s.length > 1 && sans.widthOfTextAtSize(s, 8) > colWidths[i]! - 6) s = s.slice(0, -2) + ".";
      page.drawText(s, { x, y, size: 8, font: sans, color: INK });
      x += colWidths[i]!;
    });
    y -= 13;
  }
  return doc.save();
}
