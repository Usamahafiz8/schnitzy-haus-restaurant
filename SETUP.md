# Local setup & what's needed to go live

Status: dependencies installed, PostgreSQL 17 running locally, database
migrated and seeded, `.env.local` / `.env` configured, `pnpm dev` serves
real data end to end. Health check as of the last full pass — all green:

| Check | Result |
| --- | --- |
| `pnpm typecheck` | ✓ 0 errors |
| `pnpm lint` | ✓ 0 errors |
| `pnpm test` (50 unit tests) | ✓ all pass |
| `pnpm build` (production build) | ✓ succeeds |
| `node scripts/smoke.mjs` (35 API checks: auth, ordering, pricing, coupons, staff workflow, bookings, RBAC, i18n) | ✓ 35/35 pass |

The codebase itself has no known bugs. What's below is the list of real
content and real credentials still needed before this is a live site rather
than a local demo.

## 0. Checklist to go from "demo" to "live restaurant site"

- [ ] **Real photography** — 19 dish photos + hero + interior shot. Site
      currently uses generated placeholder graphics (gradient + dish name).
      See "Images" below for the exact file list.
- [ ] **Production database** — currently points at a local PostgreSQL
      instance on this machine (`localhost:5432`), which only runs while
      this computer is on. Needed: a hosted Postgres (Neon, Supabase, or
      Vercel Postgres). See "Database" below.
- [ ] **A fresh `AUTH_SECRET` for production** — don't reuse the one
      generated for local dev. `openssl rand -base64 32`.
- [ ] **Stripe live keys** — to actually take card payments. Without them,
      cash/pay-on-collection still works, so this can wait until launch.
- [ ] **A domain + hosting** — README recommends Vercel (the app is built
      for it: serverless-friendly, SSE for live order updates, security
      headers already configured). `NEXT_PUBLIC_APP_URL` must be set to the
      real domain once deployed.
- [ ] **Everything in the "optional integrations" table below** — Google
      Maps, transactional email, WhatsApp, push notifications, file
      uploads, Redis, Sentry. None of these block launch; each has a
      working fallback (see the table for what you lose without it).

## 1. Required to actually use the app

| Variable       | What it's for                          | Current value |
| -------------- | --------------------------------------- | ---------------- |
| `DATABASE_URL` | PostgreSQL connection string            | `postgresql://postgres:postgres@localhost:5432/schnitzy_haus` — a local PostgreSQL 17 instance installed via winget (Windows service `postgresql-x64-17`, superuser `postgres` / password `postgres`) |
| `AUTH_SECRET`  | Signs NextAuth session JWTs             | Generated, set in `.env.local` |

Nothing else is required to boot the app — every third-party integration
below has a documented fallback.

### Database

Set up: PostgreSQL 17 installed locally as a Windows service, `schnitzy_haus`
database created, migrations applied, demo data seeded (19 menu items, 386
orders, 22 bookings). It's set in **two** files because Next.js reads
`.env.local` but the Prisma CLI reads `.env` — keep them in sync if you
change it:

- `.env.local` → used by `pnpm dev` / `pnpm build`
- `.env` → used by `pnpm db:migrate` / `pnpm db:seed` / `pnpm db:studio`

**Switching to your own database later** (e.g. a hosted Neon/Supabase URL):
replace `DATABASE_URL` in both `.env.local` and `.env` with your connection
string, then run:

```bash
pnpm db:migrate   # applies the schema to the new database
pnpm db:seed      # loads demo menu, staff accounts, 6 weeks of demo orders
pnpm dev          # http://localhost:3000
```

Seeded login accounts (password `Password123` for all):

| Email                     | Role     |
| ------------------------- | -------- |
| `admin@schnitzyhaus.de`   | ADMIN    |
| `staff@schnitzyhaus.de`   | STAFF    |
| `kitchen@schnitzyhaus.de` | KITCHEN  |
| `driver@schnitzyhaus.de`  | DELIVERY |
| `customer@example.com`    | CUSTOMER |

### Images

Every dish, the homepage hero, and the About page interior shot currently
use generated placeholder graphics (gradient background + dish name), not
real photos. Nothing is broken — the code correctly loads whatever file
sits at these paths, so real photos can drop straight in with **no code
changes**, matching these exact filenames:

`public/images/dishes/`: beef-burger.jpg, double-beef-burger.jpg,
crispy-chicken-burger.jpg, schnitzel-burger.jpg, veggie-burger.jpg,
beef-bowl.jpg, schnitzy-bowl.jpg, veggie-bowl.jpg, loaded-fries.jpg,
pommes-frites.jpg, sweet-potato-fries.jpg, onion-rings.jpg, coleslaw.jpg,
brownie.jpg, new-york-cheesecake.jpg, milkshake.jpg, softdrink-0-4l.jpg,
apfelschorle-0-4l.jpg, pilsner-0-33l.jpg (19 files)

`public/images/`: hero-burger.jpg (homepage banner), interior.jpg (About
page restaurant interior)

## 2. Optional integrations (app works without these; feature-specific fallback shown)

| Service | Env vars | Get it from | Without it |
| --- | --- | --- | --- |
| **Stripe** (card payments) | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | [dashboard.stripe.com](https://dashboard.stripe.com/test/apikeys) (test mode keys); webhook secret comes from running `stripe listen --forward-to localhost:3000/api/payment/webhook` locally | Card payment disabled; pay-on-collection still works |
| **Google Maps** | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `GOOGLE_MAPS_SERVER_KEY` | [Google Cloud Console](https://console.cloud.google.com/google/maps-apis) — enable Maps JavaScript, Places, Geocoding APIs | Location page shows address as text, no map/geocoding |
| **Email (SMTP)** | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM` | Any SMTP provider, e.g. [SendGrid](https://sendgrid.com) | Emails are printed to the server console instead of sent |
| **WhatsApp (Twilio)** | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` | [twilio.com/console](https://console.twilio.com) (WhatsApp sandbox is free for dev) | Messages logged only; click-to-chat link still works |
| **Push notifications (Firebase/FCM)** | `FIREBASE_SERVICE_ACCOUNT_JSON` + `NEXT_PUBLIC_FIREBASE_*` (6 vars) | [Firebase Console](https://console.firebase.google.com) → Project settings → Service accounts (server JSON) and General (web app config) | Push skipped; in-app notifications still land |
| **File uploads (S3)** | `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION`, `S3_ENDPOINT`, `S3_PUBLIC_URL` | Any S3-compatible provider (AWS S3, Cloudflare R2, Backblaze B2, MinIO) | Files written to `public/uploads` (dev only, doesn't survive redeploys) |
| **Redis** | `REDIS_URL` | [Upstash](https://upstash.com) (free tier) for prod, or a local Redis for dev | Rate limiting/caching fall back to per-instance memory (fine for single-instance local dev) |
| **Sentry** | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | [sentry.io](https://sentry.io) | Errors go to the server log instead |

The running app's **Settings → Integrations** tab (staff dashboard, ADMIN
role) shows live status of each of these once the DB is connected.

## 3. Commands reference

| Command | Does |
| --- | --- |
| `pnpm dev` | Dev server at http://localhost:3000 |
| `pnpm build` | Production build (`prisma generate` + `next build`) |
| `pnpm start` | Serve the production build |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm test` | Jest unit tests |
| `pnpm test:e2e` | Playwright (needs `pnpm exec playwright install` first) |
| `pnpm test:smoke` | API smoke test against a running server |
| `pnpm db:migrate` | Create/apply a migration (dev) |
| `pnpm db:deploy` | Apply migrations (prod/CI) |
| `pnpm db:seed` | Load demo data |
| `pnpm db:studio` | Prisma Studio (DB browser UI) |

See `README.md` for full architecture notes and deployment guidance.
