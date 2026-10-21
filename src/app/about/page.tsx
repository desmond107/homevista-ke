import Link from "next/link";
import { StaticPage, pageMeta } from "@/components/StaticPage";

export const generateMetadata = () => pageMeta("about", "About HomeVista Ke");

export default function AboutPage() {
  return (
    <StaticPage slug="about" eyebrow="Our story">
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/properties" className="btn-primary">Explore properties</Link>
        <Link href="/register?as=lister" className="btn-outline">List with us</Link>
      </div>
    </StaticPage>
  );
}
