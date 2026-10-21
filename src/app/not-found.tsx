import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="container-x flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gold-soft text-gold-deep"><Compass size={30} /></span>
      <p className="eyebrow mb-3">404</p>
      <h1 className="text-4xl sm:text-5xl">This vista doesn&apos;t exist</h1>
      <p className="mt-3 max-w-md text-ink-2">The page or listing you&apos;re looking for may have been let, sold or moved.</p>
      <div className="mt-8 flex gap-3">
        <Link href="/properties" className="btn-primary">Browse properties</Link>
        <Link href="/" className="btn-outline">Go home</Link>
      </div>
    </div>
  );
}
