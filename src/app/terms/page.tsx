import { StaticPage, pageMeta } from "@/components/StaticPage";

export const generateMetadata = () => pageMeta("terms", "Terms of Use");

export default function Page() {
  return <StaticPage slug="terms" eyebrow="Legal" />;
}
