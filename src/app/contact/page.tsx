import type { Metadata } from "next";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { BRAND } from "@/lib/constants";
import { PageHeader } from "@/components/ui";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = { title: "Contact us", description: "Get in touch with the HomeVista Ke team in Westlands, Nairobi." };

export default function ContactPage() {
  const items = [
    { icon: <MapPin size={18} />, label: "Visit", value: BRAND.address },
    { icon: <Phone size={18} />, label: "Call", value: BRAND.phone, href: `tel:${BRAND.phone.replace(/\s/g, "")}` },
    { icon: <MessageCircle size={18} />, label: "WhatsApp", value: "Chat with support", href: `https://wa.me/${BRAND.whatsapp}` },
    { icon: <Mail size={18} />, label: "Email", value: BRAND.email, href: `mailto:${BRAND.email}` },
    { icon: <Clock size={18} />, label: "Hours", value: "Mon–Fri 8:00–18:00 · Sat 9:00–13:00 (EAT)" },
  ];
  return (
    <>
      <PageHeader eyebrow="Contact" title="We'd love to hear from you" intro="Questions about a listing, a payment, verification or partnerships — our Nairobi team is here to help." />
      <div className="container-x grid gap-10 py-12 lg:grid-cols-[1fr_1.3fr]">
        <ul className="space-y-5">
          {items.map((i) => (
            <li key={i.label} className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold-deep">{i.icon}</span>
              <span>
                <span className="block text-xs tracking-wider text-muted uppercase">{i.label}</span>
                {i.href ? <a href={i.href} className="text-ink hover:text-gold-deep" {...(i.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{i.value}</a> : <span className="text-ink">{i.value}</span>}
              </span>
            </li>
          ))}
        </ul>
        <ContactForm />
      </div>
    </>
  );
}
