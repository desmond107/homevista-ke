import { NextResponse, type NextRequest } from "next/server";

/*
 * Edge middleware:
 *  1. CSRF — every state-changing /api request must come from our own origin.
 *     (Server Actions get the same check from Next.js itself.) The M-Pesa callback and cron
 *     endpoints are server-to-server and authenticate with their own secrets instead.
 *  2. Cheap gate — private areas bounce visitors without a session cookie to /login.
 *     Real role checks happen on the server in every page and action.
 */
const CSRF_EXEMPT = ["/api/mpesa/callback/", "/api/cron"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(req.method) && !CSRF_EXEMPT.some((p) => pathname.startsWith(p))) {
    const origin = req.headers.get("origin");
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    if (!origin || !host || new URL(origin).host !== host) {
      return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });
    }
  }

  if (/^\/(account|lister|admin)(\/|$)/.test(pathname) && !req.cookies.get("hv_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/api/:path*", "/account/:path*", "/account", "/lister/:path*", "/lister", "/admin/:path*", "/admin"] };
