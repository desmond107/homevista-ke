import { icons, type LucideProps } from "lucide-react";

/** Renders a lucide icon by kebab-case name (admin-editable on types/amenities). Server-only usage keeps the icon set out of client bundles. */
export function DynIcon({ name, fallback = "circle-check", ...props }: { name: string; fallback?: string } & LucideProps) {
  const pascal = (s: string) => s.replace(/(^|-)([a-z0-9])/g, (_, __, c: string) => c.toUpperCase());
  const Icon = icons[pascal(name) as keyof typeof icons] ?? icons[pascal(fallback) as keyof typeof icons];
  return <Icon aria-hidden {...props} />;
}
