import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Counts an advert click, then redirects to the advertiser. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ad = await prisma.advert.findUnique({ where: { id }, select: { linkUrl: true } });
  if (!ad) return NextResponse.redirect(new URL("/", req.url));
  await prisma.advert.update({ where: { id }, data: { clicks: { increment: 1 } } }).catch(() => {});
  const target = /^https?:\/\//.test(ad.linkUrl) || ad.linkUrl.startsWith("/") ? ad.linkUrl : "/";
  return NextResponse.redirect(new URL(target, req.url), 302);
}
