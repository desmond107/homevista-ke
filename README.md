# HomeVista Ke

**Find Your Vista. Find Your Home.** A premium real estate marketplace for Kenya, with verified listers, M-Pesa payments, and an admin panel for running the business.

- **Seekers** browse, search, save and review properties for free. They pay **KSh 250** via M-Pesa to unlock a property's exact location and the lister's phone, WhatsApp and email. An unlock never expires.
- **Listers** (landlords, agents, realtors, companies and developers) complete KYC and pay **KSh 1,000 / 30 days** via M-Pesa. Their listings are visible only while KYC is approved and the subscription is active.
- **Admins** have a full control panel with role-based staff permissions.

Stack: **Next.js 15** (App Router, Server Actions) · **TypeScript** · **PostgreSQL + Prisma 6** · **Tailwind CSS 4** · Leaflet/OpenStreetMap · Recharts · pdf-lib · sharp.

---

## Quick start

Prerequisites: Node 20+, PostgreSQL 14+.

```bash
npm install
cp .env.example .env          # set DATABASE_URL, AUTH_SECRET, CRON_SECRET, MPESA_CALLBACK_TOKEN
createdb homevista_ke
npx prisma migrate deploy     # or: npm run db:migrate (dev)
npm run db:seed               # sample Kenyan data (WIPES the database — dev only)
npm run dev                   # http://localhost:3000
```

### Demo accounts

All demo accounts use the password `HomeVista-dev-2026`.

| Email | Role |
|---|---|
| admin@homevista.co.ke | Super admin |
| moderator@homevista.co.ke | Staff admin (analytics, KYC, listings, reviews) |
| grace@vistaprime.co.ke | Verified lister (company) |
| faith@lakesidehomes.co.ke | Lister whose subscription ends in 2 days |
| lucy.njeri@gmail.com | Lister with an **expired** subscription (listings auto-hidden) |
| kevin.mutua@gmail.com | Lister with KYC **pending** (listings hidden) |
| wanjiku@example.com | Property seeker with unlocks, favourites, reviews and saved searches |

With `MPESA_MODE=simulate` (the default), the payment modal shows a **simulated phone**. Its buttons are *Enter PIN*, *Cancel*, *Wrong PIN* and *Time out*. Each one builds a Daraja-shaped callback and runs it through the real callback handler, so every payment path can be tested without credentials.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run db:migrate` / `db:deploy` | Prisma migrations (dev / production) |
| `npm run db:seed` | Reseeds sample data (refuses to run in production) |
| `npm run db:bootstrap` | Prepares a production database: settings, taxonomy, starter FAQs and legal pages, and the first super admin (`BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_PASSWORD`). Never deletes; safe to re-run |
| `npm run cron:run` | Runs the scheduled jobs once |
| `npm run smoke` | 95 end-to-end checks against a running server (pages, dashboards, security, the full M-Pesa flow, subscriptions, cron) |
| `npm run lint` / `typecheck` | ESLint / TypeScript |

---

## What's included

| Brief | Where |
|---|---|
| Luxurious navy, champagne-gold and ivory design; Playfair Display + Inter; light/dark mode | `src/app/globals.css` (design tokens), `src/components/*` |
| Home: hero search, featured, browse by type, popular locations, collections, how it works, realtors, companies, ads, testimonials | `src/app/page.tsx` |
| Search: every filter in the brief, 6 sorts, grid/list/map with clustered pins, pagination, saved searches with email alerts | `src/app/properties/page.tsx`, `src/lib/search.ts` |
| Property page: lightbox gallery, facts, amenities, video/virtual-tour embed, locked map and contact card, reviews with breakdown, lister replies, report, share, similar, JSON-LD | `src/app/properties/[slug]/page.tsx` |
| M-Pesa STK Push for unlocks and subscriptions, polling, STK Query fallback, PDF receipts | `src/lib/mpesa.ts`, `src/lib/payments.ts`, `src/app/api/payments/*`, `src/app/api/mpesa/callback/[token]` |
| KYC: ID front/back, selfie, business certificate, KRA PIN, EARB number, proof of ownership; 6 statuses; gold Verified badge; revocation | `src/app/lister/kyc`, `src/app/admin/kyc` |
| Lister dashboard: analytics, listings CRUD (20 photos with drag-to-reorder, map pin picker), pause/resume, subscription, KYC, messages, review replies, public profile | `src/app/lister/*` |
| Seeker dashboard: favourites, unlocked properties, payment history, reviews, saved searches, notifications, profile | `src/app/account/*` |
| Admin: analytics with date filters, users (suspend/ban/delete), KYC queue, listing moderation and featuring, reports, reviews, ads with impressions/clicks, companies, realtors, taxonomy, payments with CSV/PDF export, content (blog, FAQs, legal pages, testimonials), pricing and settings, staff permissions, audit log | `src/app/admin/*`, `src/app/actions/admin.ts` |
| Directory pages: companies, realtors, lister profiles | `src/app/companies`, `src/app/realtors`, `src/app/listers` |
| About, Contact, FAQ, Blog, Terms, Privacy | `src/app/*` |
| Notifications: email, SMS and in-app, for registration, receipts, KYC changes, reminders (5/2/1 days), expiry and enquiries | `src/lib/notify.ts`, `src/lib/cron.ts` |
| Google sign-in, phone OTP | `src/lib/google.ts`, `src/lib/otp.ts`, `src/app/verify-phone` |
| SEO: clean URLs, metadata, Open Graph, sitemap, robots, schema.org (`RealEstateListing`, `RealEstateAgent`, `Article`, `FAQPage`) | throughout |

### Visibility rule (no cron needed)

A listing appears publicly only when **all** of these hold:

- the listing is `ACTIVE`
- the lister's KYC is `APPROVED`
- the lister's subscription end date is in the future
- the lister's account is active

The rule is evaluated in every query (`publicWhere()` in `src/lib/listings.ts`), so an expired subscription hides listings the moment it lapses. Renewing shows them again immediately. Renewals extend from the current end date, so no paid days are lost.

---

## M-Pesa Daraja setup

1. Create an app on [developer.safaricom.co.ke](https://developer.safaricom.co.ke) and enable **Lipa na M-Pesa Online**.
2. Set `MPESA_MODE=sandbox` and fill in `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE` (sandbox `174379`) and `MPESA_PASSKEY`.
3. `APP_URL` must be **public HTTPS**. Use ngrok or a deployed preview while testing. The callback URL is `${APP_URL}/api/mpesa/callback/${MPESA_CALLBACK_TOKEN}`.
4. For go-live, set `MPESA_MODE=production` with your Paybill or Till credentials. For a Till, also set `MPESA_TRANSACTION_TYPE=CustomerBuyGoodsOnline` and `MPESA_PARTY_B`.

**How payments are protected**

- **No double charges.** A partial unique index allows only one *pending* payment per user and item, so a second click reuses the prompt already sent. An already-unlocked property can't be paid for again, and `mpesaReceipt` is unique.
- **Idempotent callbacks.** Fulfilment is guarded by a single status transition, so Safaricom retries can never unlock twice.
- **Forged callbacks rejected.** The callback URL carries a secret token checked in constant time, with an optional IP allow-list. A "success" callback is re-checked with **STK Query** before anything is unlocked.
- **Missing callbacks recovered.** While the customer waits, the client polls and the server falls back to STK Query. Prompts that are never answered time out after 3 minutes with a clear retry message.
- **Configurable prices.** Admins set both prices and the subscription length under Admin → Settings. The new values apply to payments started afterwards.

## Scheduled jobs

Call `GET /api/cron` hourly with `Authorization: Bearer $CRON_SECRET`. `vercel.json` already does this on Vercel. On a VPS, use crontab:

```
0 * * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://homevista.co.ke/api/cron
```

The jobs send subscription reminders 5, 2 and 1 days before expiry, plus an expiry notice (email, SMS and in-app). They also send saved-search alerts (at most daily per search) and clean up expired sessions, OTPs, rate-limit buckets and stale prompts. Every job is idempotent.

## Notifications

- **Email:** set `RESEND_API_KEY`.
- **SMS:** set `AT_USERNAME`, `AT_API_KEY` and an approved `AT_SENDER_ID` (Africa's Talking).
- Without keys, messages are written to the `OutboundMessage` table and the server log. Admin → Settings shows the most recent ones. In development without an SMS provider, the OTP code is also shown on screen.

## Storage & uploads

- **Local default.** Files go to `./storage` on local disk. `public/` holds photos, logos and banners, served at `/media/…`. `private/` holds KYC documents and is never served publicly; they stream through `/api/admin/kyc-file/…` to admins with the KYC permission, and every view is audit-logged.
- **Production.** For multi-server or serverless hosting, set the `S3_*` variables (AWS S3, Cloudflare R2, Spaces…). Use a separate **private** bucket for KYC.
- **Upload checks.** Files are identified by their content (an image decode or PDF magic bytes), never by name. Images are re-encoded to WebP, which strips EXIF data including GPS. Filenames are random, and size limits are enforced on the server. The listing editor also compresses photos in the browser before uploading.

## Security

- **Passwords:** bcrypt (cost 12). Login timing is equalised so it doesn't reveal which emails are registered.
- **Sessions:** random 256-bit tokens, stored hashed, in HttpOnly SameSite=Lax cookies.
- **Access control:** roles are USER, LISTER and ADMIN. Admins are either super admins or staff with granular permissions, and every page, action and route checks on the server.
- **CSRF:** Server Actions check the request origin, and middleware rejects cross-site `POST`s to `/api`. Google OAuth uses a `state` cookie.
- **XSS:** React escaping, and a strict Content-Security-Policy, `X-Frame-Options: DENY` and `nosniff`. Blog and legal content goes through a tiny markdown renderer that never injects HTML.
- **Rate limiting** (Postgres-backed, so it holds across instances) on login, registration, OTP, payments, reviews, reports, messages and contact.
- **Validation:** zod schemas on every input. CSV exports guard against spreadsheet formula injection.
- **HTTPS:** HSTS header is set; terminate TLS at your host or proxy.

## Deployment notes

- **Hosting:** Vercel, Railway, Render or a VPS behind Nginx all work. Use managed Postgres (Neon, Supabase, RDS…) and S3/R2 for files when running more than one instance.
- **Map tiles:** the public OpenStreetMap tile servers aren't meant for production traffic. Set `NEXT_PUBLIC_MAP_TILE_URL` (and `NEXT_PUBLIC_MAP_ATTRIBUTION`) to a provider such as MapTiler, Stadia or Mapbox.
- **Payments:** a production build refuses `MPESA_MODE=simulate` (unset counts as simulate) unless `ALLOW_SIMULATED_PAYMENTS=true`.
- **Sample data:** seed photos are Unsplash placeholders, and the virtual tours are Matterport's public demo models. Company logos fall back to elegant monograms.
- **Brand details:** the phone number, email and address in `src/lib/constants.ts` are placeholders. Replace them before launch.

## Project structure

```
prisma/              schema, migrations, seed + seed data
scripts/             smoke test, cron runner
src/app/             routes: public pages, account/, lister/, admin/, api/
src/app/actions/     server actions (auth, user, lister, admin, public)
src/components/      UI (cards, forms, gallery, payment modal, charts, map…)
src/lib/             auth, payments, mpesa, search, storage, uploads, notify, cron, pdf…
```
# homevista-ke
