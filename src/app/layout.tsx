import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { themeInitScript } from "@/components/ThemeToggle";
import { BRAND } from "@/lib/constants";
import { appUrl } from "@/lib/notify";
import { getSettings } from "@/lib/settings";
import "./globals.css";

const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: { default: `${BRAND.name} — ${BRAND.tagline}`, template: `%s · ${BRAND.name}` },
  description:
    "Premium homes, apartments, land and commercial property for sale and rent across Kenya — Nairobi, Kiambu, Kajiado, Mombasa, Kisumu, Nakuru and beyond. Verified listers and secure M-Pesa payments.",
  applicationName: BRAND.name,
  keywords: ["Kenya real estate", "houses for sale Nairobi", "apartments for rent Nairobi", "land for sale Kenya", "Airbnb Nairobi", "off-plan Kenya"],
  openGraph: { type: "website", siteName: BRAND.name, locale: "en_KE" },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/icon.svg" },
  // Stops mobile browsers auto-linking phone numbers/addresses, which mutates the DOM and breaks hydration.
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1322" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { siteNotice } = await getSettings();
  return (
    <html lang="en-KE" className={`${playfair.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-full focus:bg-navy focus:px-4 focus:py-2 focus:text-on-navy">
          Skip to content
        </a>
        {siteNotice && <div className="bg-gold px-4 py-2 text-center text-xs font-medium text-[#0c1a2e]" role="status">{siteNotice}</div>}
        <Header />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
