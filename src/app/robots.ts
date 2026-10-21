import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/notify";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/account", "/lister", "/api/", "/login", "/register", "/verify-phone"] }],
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
