# Schnitzy Haus

A complete restaurant platform: a mobile-first customer app for ordering,
booking and rewards, plus a staff dashboard for running the floor and the
kitchen.

Next.js 15 (App Router) · TypeScript · PostgreSQL + Prisma · Tailwind v4 ·
NextAuth v5 · Stripe · EN/DE.

---

## Quick start

```bash
pnpm install                       # npm/yarn work too, but the lockfile is pnpm's
cp .env.example .env               # then fill in DATABASE_URL and AUTH_SECRET
createdb schnitzy_haus             # or point DATABASE_URL at any Postgres
pnpm db:migrate                    # create the schema
pnpm db:seed                       # menu, staff, 6 weeks of demo orders
pnpm dev                           # http://localhost:3000
```

Generate an auth secret with `openssl rand -base64 32`.

### Seeded accounts

All use the password `Password123`.

| Email                     | Role     | Sees                                    |
| ------------------------- | -------- | --------------------------------------- |
| `admin@schnitzyhaus.de`   | ADMIN    | Everything, including money and settings |
| `staff@schnitzyhaus.de`   | STAFF    | Orders, bookings, tables, menu, reviews  |
| `kitchen@schnitzyhaus.de` | KITCHEN  | Orders and the menu                      |
| `driver@schnitzyhaus.de`  | DELIVERY | Orders                                   |
| `customer@example.com`    | CUSTOMER | The storefront                           |

The app runs with **no third-party keys at all**. Stripe, Google Maps, SMTP,
Twilio, FCM and S3 each degrade to a documented fallback (see
[Integrations](#integrations)), so you can build and demo the whole thing before
signing up for anything.

---

## What's in the box

### Customer

Menu browsing with live search and dietary filters · dish detail pages with
allergens · persistent cart with per-line notes · guest **or** signed-in
checkout · Stripe card payments and pay-on-collection · coupon codes · loyalty
points redeemable at checkout · live order tracking · table booking against real
availability · reviews with photos · favourites · saved addresses · notification
preferences · EN/DE · installable PWA.

### Staff

Live order board with an audible new-order alert · one-tap status moves along a
validated state machine · printable kitchen tickets · refunds · booking calendar
with table assignment · floor plan with table status · menu and category
management with bulk actions and image upload · review moderation and replies ·
coupon builder · loyalty member list with manual adjustments · analytics
(revenue, peak hours, best sellers, repeat rate) with CSV export · staff and role
management · restaurant settings · customer support inbox.

---

## Commands

| Command            | Does                                            |
| ------------------ | ----------------------------------------------- |
| `pnpm dev`         | Development server                              |
| `pnpm build`       | Production build (runs `prisma generate` first) |
| `pnpm start`       | Serve the production build                      |
| `pnpm typecheck`   | `tsc --noEmit`                                  |
| `pnpm lint`        | ESLint                                          |
| `pnpm test`        | Jest unit tests                                 |
| `pnpm test:e2e`    | Playwright, mobile Safari + desktop Chrome      |
| `pnpm test:smoke`  | API end-to-end check against a running server   |
| `pnpm db:migrate`  | Create and apply a migration                    |
| `pnpm db:deploy`   | Apply migrations (production/CI)                |
| `pnpm db:seed`     | Load demo data                                  |
| `pnpm db:studio`   | Prisma Studio                                   |

There's also `node scripts/smoke.mjs`, an API-level end-to-end check against a
running server — sign-up, pricing, coupon limits, order lifecycle, RBAC,
bookings and i18n in about five seconds.

---

## Architecture

```
app/
  (customer)/          Storefront: home, menu, cart, checkout, orders, bookings,
                       loyalty, profile, location, reviews
  admin/               Dashboard, role-gated in both middleware and layout
  auth/                Sign in, sign up, password reset, email verification
  api/                 Route handlers (see docs/API.md)
components/
  customer/ admin/ shared/ ui/
lib/
  api.ts               Route-handler plumbing: responses, guards, errors, paging
  errors.ts            Domain errors — no Next imports, so logic stays testable
  pricing.ts           The single source of truth for what an order costs
  orders.ts            Order numbers and the status state machine
  bookings.ts          Slot generation, availability, table assignment
  loyalty.ts           Points, tiers, thresholds
  analytics.ts         Dashboard and reporting queries
  realtime.ts          SSE fan-out for live order status
  notifications.ts     One call fans out to in-app, email, push and WhatsApp
prisma/schema.prisma   28 models
messages/{en,de}.json  Every user-facing string
```

### Principles worth knowing before you change things

**The server prices every order.** `lib/pricing.ts` recomputes totals from live
menu rows on every checkout. `lib/cart-pricing.ts` is a deliberate client-side
mirror used only to show a running total — it is never trusted. If you change one,
change both, and update `tests/unit/pricing.test.ts`.

**Order numbers self-heal.** `nextOrderNumber` seeds its per-day counter from the
highest number already issued that day, so seeded, imported or restored rows
can't collide with live traffic.

**Money is `Decimal` in the database and `number` on the wire.** Everything
crossing the server/client boundary goes through `lib/serialize.ts`; Prisma's
`Decimal` doesn't survive `JSON.stringify` in a usable shape.

**Menu items and coupons are retired, not deleted,** once they appear in an
order. Deleting them would leave past receipts unresolvable, so the API hides
them instead and tells you it did.

**Status changes are a state machine.** `STATUS_TRANSITIONS` in `lib/orders.ts`
is enforced server-side and mirrored in the dashboard buttons, so a staff member
is never shown an action that would 409.

**Integration failures never roll back a sale.** Email, WhatsApp and push are
fired after the transaction commits and are individually caught. A dead SMTP
server must not cost you an order.

---

## Integrations

Every one is optional. Set the env vars to switch it on; leave them blank and the
app takes the fallback.

| Service               | Env                                                 | Without it                                               |
| --------------------- | --------------------------------------------------- | -------------------------------------------------------- |
| **Stripe**            | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Card payment is disabled; cash on collection still works |
| **Google Maps**       | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `GOOGLE_MAPS_SERVER_KEY` | Location page shows the address without a map; no geocoding |
| **Email**             | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`           | Emails are printed to the server console                 |
| **WhatsApp (Twilio)** | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` | Messages are logged; the click-to-chat link still works  |
| **Push (FCM)**        | `FIREBASE_SERVICE_ACCOUNT_JSON` + `NEXT_PUBLIC_FIREBASE_*` | Push is skipped; in-app notifications still land          |
| **Uploads (S3)**      | `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Files are written to `public/uploads` (development only) |
| **Redis**             | `REDIS_URL`                                          | Rate limiting and caching fall back to per-instance memory |
| **Sentry**            | `SENTRY_DSN`                                         | Errors go to the structured server log                    |

The dashboard's **Settings → Integrations** tab shows which of these are live.

### Stripe locally

```bash
stripe listen --forward-to localhost:3000/api/payment/webhook
```

Copy the printed `whsec_…` into `STRIPE_WEBHOOK_SECRET`. Card `4242 4242 4242 4242`
with any future expiry succeeds. The webhook is what marks an order paid and
awards loyalty points — points are never granted before the money lands.

---

## Deviations from the brief

Two, both deliberate, both flagged rather than quietly substituted:

**Socket.io → Server-Sent Events.** Socket.io needs a long-lived custom Node
server, which rules out the serverless targets in the brief (Vercel). SSE gives
the same server-push semantics over plain HTTP, reconnects natively in the
browser, and adds nothing to the client bundle. `lib/realtime.ts` keeps a
transport-shaped `subscribe`/`publish` surface, so moving to Socket.io later
means rewriting that one file. With `REDIS_URL` set it also fans out across
instances via Redis pub/sub.

**Order line items are a relation, not a JSON column.** The brief specified
`items` as JSON on `Order`. Best-seller analytics and per-item revenue are
required features, and answering them over a JSON blob means a full table scan
on every dashboard load. `OrderItem` is a proper table that snapshots name and
price at order time — so menu edits still never rewrite order history, which is
what the JSON design was protecting.

**PDF reports** export as CSV plus printable HTML (the receipt and kitchen ticket
views are print-styled) rather than server-rendered PDFs, which would mean
shipping a headless renderer. Browser print-to-PDF produces the same document
staff see on screen.

---

## Testing

```bash
pnpm test                 # 50 unit tests: pricing, loyalty, transitions, utils
pnpm build && pnpm start
node scripts/smoke.mjs    # 35 API checks end to end
pnpm test:e2e             # 26 browser tests, mobile Safari + desktop Chrome
```

Unit tests cover the parts where a bug costs money: VAT extraction, coupon caps,
points that must never make a total negative, the order state machine, and
opening hours that run past midnight.

---

## Deployment

### Vercel

1. **Database.** Use a pooled Postgres — Neon, Supabase or Vercel Postgres.
   Serverless functions open a connection per invocation, so an unpooled
   database runs out of slots under load. Point `DATABASE_URL` at the *pooled*
   connection string and append `?pgbouncer=true&connection_limit=1`. If your
   provider gives a separate direct URL for migrations, add
   `directUrl = env("DIRECT_URL")` to the `datasource` block in
   `prisma/schema.prisma` and set `DIRECT_URL` too.

2. **Environment variables.** At minimum `DATABASE_URL`, `AUTH_SECRET`
   (`openssl rand -base64 32`) and `NEXT_PUBLIC_APP_URL` set to the deployed
   origin. Add integrations as you enable them — everything else degrades
   gracefully. Also set `TZ=Europe/Berlin` (or the restaurant's zone): booking
   times are resolved against the server clock.

3. **Migrations.** Vercel runs `pnpm build`, which already runs
   `prisma generate`. Run `pnpm db:deploy` against production on release — as a
   release step, a one-off command, or by temporarily setting the build command
   to `pnpm db:deploy && pnpm build`. Then `pnpm db:seed` once if you want the
   demo menu.

4. **Stripe.** Point a webhook at `https://your-domain/api/payment/webhook`
   listening for `payment_intent.succeeded`, `payment_intent.payment_failed` and
   `charge.refunded`, and set `STRIPE_WEBHOOK_SECRET`. The webhook is what marks
   an order paid — without it, card orders stay pending.

5. **Uploads.** Set the `S3_*` variables. The `public/uploads` fallback writes to
   a filesystem that does not survive between invocations.

Two platform limits worth knowing:

- **Live order updates** stream over SSE. Vercel caps function duration (60s on
  Hobby, up to 300s on Pro — the routes request 300). The browser's `EventSource`
  reconnects automatically, so the feed is continuous from the user's side; it
  just costs a reconnect every few minutes on Hobby.
- **Rate limiting and the realtime fan-out are per-instance** without Redis. Set
  `REDIS_URL` (Upstash works) so limits hold across the fleet and a status change
  handled by one instance reaches subscribers on another.

### Anywhere else

`pnpm install && pnpm db:deploy && pnpm build && pnpm start` behind a reverse
proxy. A single long-lived Node process needs none of the caveats above — SSE
connections stay open and in-memory rate limiting is accurate.

### CI

`.github/workflows/ci.yml` runs lint, typecheck and unit tests, then a full
build-seed-smoke-Playwright pass against a real Postgres service.

### Security

Passwords are bcrypt (cost 12). Sessions are JWT via NextAuth v5. Every mutating
route re-checks its role server-side — the middleware is a redirect for UX, not
the security boundary. Auth, ordering, booking, review and contact endpoints are
rate limited. Password reset uses hashed, single-use, one-hour tokens and drops
every existing session on success. Card details go straight to Stripe and never
touch the server. Prisma parameterises all queries. Security headers (HSTS,
nosniff, frame-options, referrer, permissions policy) are set in `next.config.ts`.

---

## Adding a second restaurant

The schema is already multi-tenant — every menu item, order, booking and coupon
carries a `restaurantId`. The single-tenant assumption lives in exactly one
place: `lib/restaurant.ts`, which resolves the current restaurant by slug. Change
that resolver (to read a subdomain, a path segment or a header) and the rest of
the app follows.
