import Link from "next/link";
import { requireLister } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DashHeader } from "@/components/DashShell";
import { ListerProfileForm } from "./ListerProfileForm";

export default async function ListerProfilePage() {
  const user = await requireLister();
  const l = await prisma.listerProfile.findUniqueOrThrow({ where: { id: user.listerId } });
  const local = (p: string | null) => (p ? `0${p.slice(3)}` : "");
  return (
    <>
      <DashHeader
        title="Public profile"
        intro="Your name, logo and bio are public. Phone, WhatsApp and email are revealed only to seekers who unlock one of your listings."
        action={<Link href={`/listers/${l.slug}`} className="btn-outline">View public profile</Link>}
      />
      <ListerProfileForm
        initial={{ displayName: l.displayName, bio: l.bio ?? "", phone: local(l.phone), whatsapp: local(l.whatsapp), email: l.email, website: l.website ?? "", logoUrl: l.logoUrl }}
      />
    </>
  );
}
