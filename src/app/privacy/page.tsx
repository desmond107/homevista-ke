import { StaticPage, pageMeta } from "@/components/StaticPage";

export const generateMetadata = () => pageMeta("privacy", "Privacy Policy");

export default function Page() {
  return <StaticPage slug="privacy" eyebrow="Legal" />;
}
