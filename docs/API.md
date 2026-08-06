# API reference

All routes live under `/api`. Responses are JSON.

**Success** — `{ "data": ... }`
**Error** — `{ "error": "Human-readable message", "code"?: "...", "details"?: { "field": ["..."] } }`

| Status | Meaning                                                    |
| ------ | ---------------------------------------------------------- |
| 200    | OK                                                         |
| 201    | Created                                                    |
| 204    | Deleted, no body                                           |
| 400    | Business rule violated (message is safe to show the user)  |
| 401    | Not signed in                                              |
| 403    | Signed in, wrong role or not your resource                 |
| 404    | Not found                                                  |
| 409    | Conflict — e.g. an illegal order status transition         |
| 422    | Validation failed; `details` is keyed by form field        |
| 429    | Rate limited                                               |
| 500    | Unexpected; the message is deliberately generic            |

**Access levels:** _Public_ · _Customer_ (any signed-in user) · _Staff_ (ADMIN,
STAFF, KITCHEN or DELIVERY) · _Admin_ (ADMIN only).

Money is returned as a `number`; timestamps as ISO 8601 strings.

---

## Auth

| Method | Path                        | Access   | Notes                                                     |
| ------ | --------------------------- | -------- | --------------------------------------------------------- |
| `*`    | `/auth/[...nextauth]`       | Public   | NextAuth handler: sign-in, sign-out, session, CSRF, OAuth |
| `POST` | `/auth/register`            | Public   | Creates the account, awards 100 welcome points, sends verification. Rate limited 8/min |
| `POST` | `/auth/forgot-password`     | Public   | Always returns success — never reveals whether an address exists. 4 per 15 min |
| `POST` | `/auth/reset-password`      | Public   | Single-use hashed token; invalidates every other token and all sessions |
| `GET`  | `/auth/me`                  | Customer | Current profile and notification preferences               |
| `PUT`  | `/auth/me`                  | Customer | Update name, phone, locale, notification preferences       |
| `PATCH`| `/auth/me`                  | Customer | Change password (requires the current one)                 |

Sign-in is `POST /api/auth/callback/credentials` with a `csrfToken` from
`GET /api/auth/csrf` — the standard NextAuth flow.

## Menu

| Method   | Path                       | Access | Notes                                        |
| -------- | -------------------------- | ------ | -------------------------------------------- |
| `GET`    | `/menu`                    | Public | Filters: `q`, `categoryId`, `vegan`, `vegetarian`, `glutenFree`, `available`, `featured`, `maxPrice`, `sort`, `page`, `pageSize` |
| `GET`    | `/menu/categories`         | Public | `?includeInactive=true` for staff screens     |
| `POST`   | `/menu/categories`         | Staff  |                                              |
| `GET`    | `/menu/categories/:id`     | Public | Includes its items                            |
| `PUT`    | `/menu/categories/:id`     | Staff  |                                              |
| `DELETE` | `/menu/categories/:id`     | Staff  | 409 if the category still holds dishes        |
| `POST`   | `/menu/items`              | Staff  |                                              |
| `PATCH`  | `/menu/items`              | Staff  | Bulk `available` / `unavailable` / `feature` / `unfeature` / `delete` |
| `GET`    | `/menu/items/:id`          | Public |                                              |
| `PUT`    | `/menu/items/:id`          | Staff  | Partial update                                |
| `DELETE` | `/menu/items/:id`          | Staff  | Retires instead of deleting if it appears in any order |

Explicit-restaurant aliases: `GET /restaurants/:id`, `/restaurants/:id/categories`,
`/restaurants/:id/items`.

## Orders

| Method | Path                    | Access   | Notes                                                     |
| ------ | ----------------------- | -------- | --------------------------------------------------------- |
| `POST` | `/orders`               | Public   | Guest or signed-in. Prices are recomputed server-side; returns `clientSecret` for card orders. Rate limited 20/min |
| `GET`  | `/orders`               | Customer | Your orders, paginated                                     |
| `GET`  | `/orders/:id`           | Mixed    | Owner, staff, or anyone holding a guest order's id         |
| `PUT`  | `/orders/:id/status`    | Staff    | 409 on an illegal transition                               |
| `POST` | `/orders/:id/cancel`    | Mixed    | Customers before PREPARING; staff any time. Refunds, releases the coupon, reverses points |
| `POST` | `/orders/:id/review`    | Customer | Only your own delivered order, once                        |
| `GET`  | `/orders/:id/events`    | Mixed    | **SSE** live status stream                                 |
| `GET`  | `/orders/admin/all`     | Staff    | Filters: `status`, `orderType`, `paymentStatus`, `q`, `from`, `to` |
| `GET`  | `/orders/admin/events`  | Staff    | **SSE** new-order feed for the kitchen                     |

`POST /orders` body:

```jsonc
{
  "items": [{ "itemId": "uuid", "quantity": 2, "specialNotes": "no onions" }],
  "orderType": "PICKUP",              // PICKUP | DELIVERY | DINE_IN
  "paymentMethod": "STRIPE",          // STRIPE | CASH
  "couponCode": "WILLKOMMEN10",       // optional
  "pointsToRedeem": 500,              // optional
  "tipAmount": 2.50,                  // optional
  "customerName": "…", "customerEmail": "…", "customerPhone": "…",
  "deliveryAddress": "…", "deliveryCity": "…", "deliveryPostalCode": "…",
  "specialNotes": "…", "scheduledFor": "2026-08-09T18:30:00Z"
}
```

Status flow (enforced both ways):

```
PENDING → CONFIRMED → PREPARING → READY → OUT_FOR_DELIVERY → DELIVERED
   ↓          ↓           ↓         ↓            ↓
            CANCELLED (terminal, as is DELIVERED)
```

## Payments

| Method | Path                      | Access | Notes                                                    |
| ------ | ------------------------- | ------ | -------------------------------------------------------- |
| `POST` | `/payment/create-intent`  | Mixed  | Retry payment for an existing order; reuses a live intent |
| `POST` | `/payment/webhook`        | Stripe | Signature-verified. Idempotent. Marks paid and awards points |
| `GET`  | `/payment/history`        | Customer | Completed and refunded orders                           |

The webhook is excluded from the auth middleware — its signature is its auth.

## Bookings

| Method   | Path                     | Access | Notes                                                  |
| -------- | ------------------------ | ------ | ------------------------------------------------------ |
| `GET`    | `/bookings/availability` | Public | `?date=YYYY-MM-DD&guests=N`. Real occupancy, not a fixed grid |
| `POST`   | `/bookings`              | Public | Guest or signed-in. Re-checks availability and assigns the smallest fitting table |
| `GET`    | `/bookings`              | Customer | `?upcoming=true`                                     |
| `GET`    | `/bookings/:id`          | Mixed  |                                                        |
| `PUT`    | `/bookings/:id`          | Mixed  | Customers may move it; only staff may set status or pin a table |
| `DELETE` | `/bookings/:id`          | Mixed  | Customers up to 2 hours before; staff any time         |
| `GET`    | `/bookings/admin/all`    | Staff  | `?date=`, `?status=`, `?q=`                            |

## Reviews

| Method   | Path                          | Access   | Notes                                    |
| -------- | ----------------------------- | -------- | ---------------------------------------- |
| `GET`    | `/reviews`                    | Public   | Approved only; `?mine=true` for your own including pending. Includes a rating summary |
| `POST`   | `/reviews`                    | Customer | Attaching an `orderId` proves the visit  |
| `GET`    | `/reviews/:id`                | Mixed    |                                          |
| `PUT`    | `/reviews/:id`                | Customer | Editing returns it to moderation         |
| `DELETE` | `/reviews/:id`                | Mixed    | Author or staff                          |
| `POST`   | `/reviews/:id/moderate`       | Staff    | `{ "action": "approve" \| "reject" }`    |
| `PUT`    | `/reviews/:id/moderate`       | Staff    | Publish the restaurant's reply           |
| `POST`   | `/reviews/:id/report`         | Customer | Three reports auto-hide pending re-review |
| `GET`    | `/reviews/admin/all`          | Staff    | With per-status counts                   |
| `GET`    | `/reviews/restaurant/:id`     | Public   | Approved feed for one restaurant          |

## Loyalty

| Method | Path                | Access   | Notes                                                 |
| ------ | ------------------- | -------- | ----------------------------------------------------- |
| `GET`  | `/loyalty`          | Customer | Points, tier, benefits, progress to the next tier     |
| `GET`  | `/loyalty/points`   | Customer | Balance only                                          |
| `GET`  | `/loyalty/history`  | Customer | Points ledger                                         |
| `POST` | `/loyalty/redeem`   | Customer | Converts points into a personal single-use coupon. Redeeming *at* checkout goes through `POST /orders` instead, where points and the order commit together |
| `GET`  | `/loyalty/admin`    | Staff    | Member list with tier stats and outstanding liability |
| `POST` | `/loyalty/admin`    | Staff    | Manual adjustment; notifies the customer              |

Tiers are a function of lifetime spend, so redeeming never demotes anyone.

## Coupons

| Method   | Path                  | Access | Notes                                              |
| -------- | --------------------- | ------ | -------------------------------------------------- |
| `GET`    | `/coupons`            | Public | Currently redeemable only; usage internals hidden  |
| `POST`   | `/coupons/validate`   | Public | Preview a discount. Checkout revalidates from scratch |
| `POST`   | `/coupons`            | Staff  |                                                    |
| `PUT`    | `/coupons/:id`        | Staff  |                                                    |
| `DELETE` | `/coupons/:id`        | Staff  | Deactivates instead of deleting once redeemed      |
| `GET`    | `/coupons/admin/all`  | Staff  | With redemption counts and total discounted        |

## Notifications

| Method   | Path                        | Access   | Notes                    |
| -------- | --------------------------- | -------- | ------------------------ |
| `GET`    | `/notifications`            | Customer | `?unread=true`           |
| `PUT`    | `/notifications`            | Customer | Mark all read            |
| `PUT`    | `/notifications/:id`        | Customer | Mark one read            |
| `DELETE` | `/notifications/:id`        | Customer |                          |
| `POST`   | `/notifications/subscribe`  | Customer | Register an FCM token    |
| `DELETE` | `/notifications/subscribe`  | Customer | Deregister               |

## Restaurant, admin and misc

| Method   | Path                     | Access   | Notes                                              |
| -------- | ------------------------ | -------- | -------------------------------------------------- |
| `GET`    | `/restaurant`            | Public   | Profile, hours, `isOpenNow`                        |
| `PUT`    | `/restaurant`            | Admin    | Settings                                           |
| `GET`    | `/restaurant/hours`      | Public   | Hours and current open state                       |
| `GET`    | `/admin/dashboard`       | Staff    | KPIs, recent orders, bookings, reviews, best sellers |
| `GET`    | `/admin/analytics`       | Staff    | `?from=&to=&granularity=day\|week\|month`          |
| `GET`    | `/admin/reports/:type`   | Staff    | CSV: `sales`, `orders`, `items`, `customers`, `bookings` |
| `GET`    | `/admin/staff`           | Staff    | Staff list                                         |
| `POST`   | `/admin/staff`           | Admin    | Invites by email; promotes an existing customer if the address is known |
| `PUT`    | `/admin/staff/:id`       | Admin    | Refuses to demote the last admin or yourself        |
| `DELETE` | `/admin/staff/:id`       | Admin    | Soft delete                                         |
| `GET`    | `/admin/activity`        | Admin    | Audit log                                           |
| `GET`    | `/admin/tables`          | Staff    | Tables with their next bookings                     |
| `POST`   | `/admin/tables`          | Staff    |                                                     |
| `PATCH`  | `/admin/tables`          | Staff    | Set occupancy status                                |
| `PUT`    | `/admin/tables/:id`      | Staff    |                                                     |
| `DELETE` | `/admin/tables/:id`      | Staff    | Retires; 409 if it has upcoming bookings            |
| `GET`    | `/addresses`             | Customer |                                                     |
| `POST`   | `/addresses`             | Customer | Geocodes server-side when coordinates are absent    |
| `PUT`    | `/addresses/:id`         | Customer |                                                     |
| `DELETE` | `/addresses/:id`         | Customer | Promotes another address to default                 |
| `GET`    | `/favorites`             | Customer |                                                     |
| `POST`   | `/favorites`             | Customer | Idempotent toggle                                   |
| `POST`   | `/upload`                | Mixed    | multipart. Customers may only upload review photos  |
| `GET`    | `/inquiries`             | Staff    | Support inbox                                       |
| `POST`   | `/inquiries`             | Public   | Contact form. Rate limited 5 per 10 min             |
| `POST`   | `/inquiries/:id`         | Staff    | Reply by `EMAIL` or `WHATSAPP`                      |
| `PUT`    | `/inquiries/:id`         | Staff    | `?status=OPEN\|ANSWERED\|CLOSED`                    |
| `POST`   | `/locale`                | Public   | Switch language; persists for signed-in users       |
| `GET`    | `/push-config`           | Public   | Firebase web config for the service worker (public by design) |

---

## Server-Sent Events

`/orders/:id/events` and `/orders/admin/events` stream `text/event-stream`.

```js
const source = new EventSource(`/api/orders/${orderId}/events`);
source.onmessage = (event) => {
  const payload = JSON.parse(event.data);
  // { kind: "connected" } | { kind: "order-status", status, label, at }
};
```

A comment heartbeat every 25 seconds keeps proxies from closing the connection.
`EventSource` reconnects on its own, so no retry logic is needed client-side.

## Rate limits

Per IP, backed by Redis when `REDIS_URL` is set and per-instance memory otherwise.

| Scope          | Limit             |
| -------------- | ----------------- |
| Auth           | 8 / minute        |
| Password reset | 4 / 15 minutes    |
| Orders         | 20 / minute       |
| Bookings       | 15 / minute       |
| Reviews        | 10 / minute       |
| Coupon checks  | 30 / minute       |
| Contact form   | 5 / 10 minutes    |
