# Herb & Hue — Architecture

This document describes what is implemented in the codebase today. Nothing here is aspirational: every index, validation rule and endpoint listed exists in the source.

---

## 1. System overview

```text
┌──────────────────────────────┐         ┌───────────────────────────────┐        ┌──────────────┐
│  client/ (Vite + React SPA)  │  HTTPS  │  server/ (Express + TS API)   │  TLS   │ MongoDB Atlas│
│  storefront  ·  /admin       │ ──────► │  Zod validation · JWT auth     │ ─────► │  (Mongoose)  │
│  cart in localStorage        │  JSON   │  rate limits · helmet · CORS   │        └──────────────┘
│  admin JWT in memory only    │ ◄────── │  Mongoose models · serializers │  ──► Cloudinary (uploads)
└──────────────────────────────┘         └───────────────────────────────┘
        │                                             │
        │ build (VITE_* only, public)                 │ server-side only: JWT_SECRET, MONGODB_URI,
        ▼                                             ▼              CLOUDINARY_*, ADMIN_*
   static bundle                                never sent to the browser
```

- **One process, one app factory.** `server/src/app.ts` exports `createApp()`, used by the real server and by every Supertest suite, so tests exercise the exact production middleware stack.
- **Two routers.** `/api/*` (public, rate-limited at 600 req/15 min) and `/api/admin/*` (login rate-limited at 10 attempts/15 min, then `authenticateAdmin` on every subsequent route).
- **Stateless admin sessions.** HS256 JWT with `sub` (admin id), `tv` (token version), `iss: herb-and-hue`, `aud: herb-and-hue-admin`, 2 h expiry. Revocation is a `tokenVersion` bump, checked against the database on every request.

---

## 2. Data model (Mongoose)

### `admins`
| Field | Rules |
| --- | --- |
| `name` | required, ≤80 |
| `email` | required, **unique**, lowercase, format regex |
| `passwordHash` | required, bcrypt (cost 12), `select: false` |
| `role` | `owner \| editor`, default `owner` |
| `tokenVersion` | integer ≥ 0, default 0 — bumped on password change and logout |
| `mustChangePassword` | default `true` (bootstrap forces a change at first sign-in) |
| `failedLoginAttempts`, `lockedUntil` | lockout after 5 consecutive failures, 15 minutes |

### `products`
| Field | Rules |
| --- | --- |
| `name` | required, ≤140 |
| `slug` | required, **unique**, lowercase, `^[a-z0-9]+(?:-[a-z0-9]+)*$`, auto-derived from name |
| `shortDescription` ≤260, `description` ≤5000 | defaults `''` |
| `category` | required ObjectId ref, indexed |
| `price` | integer **minor units**, 0…10,000,000 |
| `compareAtPrice` | null or integer that must be **> price** (schema + Zod) |
| `variants[]` | ≤10 subdocs: label, price (same integer rules), compare-at > price, `stockQuantity ≥ 0`, sku ≤64 |
| `stockQuantity` | integer ≥0 (used only when the product has no variants) |
| `images[]` | ≤8 image refs: safe URL (http(s) or `/app-path`), alt ≤200, optional width/height |
| `ingredients` ≤5000, `benefits[]` ≤8 ×160, `directions` ≤2000, `warnings` ≤2000 | |
| `featured`, `bestseller` | booleans, indexed |
| `displayOrder` | 0…100,000 |
| `seoTitle` ≤70, `seoDescription` ≤320 | |
| `archivedAt` | `null` or Date — **soft delete / restore** |
| `sampleData` | boolean flag surfaced to the UI |
| `adminNotes` ≤2000 | **admin-only field, never serialized publicly** |
| timestamps | `createdAt`, `updatedAt` |

Indexes: `{archivedAt, displayOrder, createdAt}`, `{category, archivedAt}`, `{archivedAt, featured}`, `{archivedAt, bestseller}`, `{name}` + unique `slug`.

### `categories`
`name` (≤80), **unique** `slug`, `description` ≤1200, optional image ref, `displayOrder`, `isActive` — index `{isActive, displayOrder}`. A category with products cannot be deleted (`409 category_in_use`).

### `reviews`
`authorName` (2–60), `email` (required, **`select: false`**), `rating` (integer 1–5, validated), `title` ≤120, `body` (10–2000), optional product ref, `status: pending|approved|rejected` (default `pending`), `adminNote` ≤500. Indexes `{status, createdAt}` and `{product, status, createdAt}`.

### `galleryitems`
`title` ≤120, `caption` ≤400, required image ref, `linkUrl` ≤2048, `displayOrder`, `isActive` (indexed with display order), `sampleData`.

### `sitesettings` (singleton)
`key` is unique and immutable (`'site'`); `getSettings()` upserts brand defaults on first read, so the storefront can never render without settings. Single document holding business identity, WhatsApp number + three message templates (general/product/cart), contact block, socials, announcement, homepage content blocks, about content, SEO, commerce (`currency`, shipping/price notes, low-stock threshold), footer copy and feature toggles.

### `analyticevents`
`type` ∈ `page_view | product_view | whatsapp_click | add_to_cart`, `path` (must start with `/`), optional product ref/slug, `referrerHost`. **TTL index** on `createdAt` expiring after 90 days, plus `{type, createdAt}` and `{productSlug, createdAt}`.

### `mediaassets`
Registry of uploaded images: unique `publicId`, url/secureUrl, provider (`cloudinary | local`), format, bytes, dimensions, `uploadedBy`. Used to check references before any destructive delete.

---

## 3. API surface

### Public (`/api`, 600 req/15 min)
| Method & path | Purpose |
| --- | --- |
| `GET /health` | Liveness + database state (`200` only when connected) |
| `GET /products` | Paginated catalogue; `search`, `category`, `sort` (featured/newest/price-asc/price-desc/name), `featured`, `bestseller`, `inStock`, `page`, `limit` |
| `GET /products/:slug`, `GET /products/:slug/related` | Detail + related products |
| `GET /categories`, `GET /categories/:slug` | Active collections with live product counts |
| `GET /reviews` | **Approved** reviews only + rating summary |
| `POST /reviews` | Submit for moderation (always `pending`) |
| `GET /gallery`, `GET /settings/public` | Active gallery items / allowlisted public settings |
| `POST /cart/validate` | Re-validate client cart lines: authoritative prices, stock, variant requirements |
| `POST /analytics/events` | Fire-and-forget telemetry (150 req/10 min limiter) |

### Admin (`/api/admin`, all behind `authenticateAdmin` except login)
| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/login`, `GET /auth/me`, `POST /auth/change-password`, `POST /auth/logout` |
| Products | `GET/POST /products`, `GET/PATCH /products/:id`, `POST /products/:id/archive|restore`, `DELETE /products/:id` (soft), `PATCH /products/order` |
| Categories | `GET/POST /categories`, `PATCH /categories/:id`, `DELETE /categories/:id`, `PATCH /categories/order` |
| Reviews | `GET /reviews`, `PATCH /reviews/:id` (moderate), `DELETE /reviews/:id` |
| Gallery | `GET/POST /gallery`, `PATCH /gallery/:id`, `DELETE /gallery/:id`, `PATCH /gallery/order` |
| Settings | `GET/PUT /settings` (PUT is a full, strict, validated document) |
| Media | `POST /uploads` (multer → magic-byte check → Cloudinary/local), `GET /media`, `DELETE /media?publicId=` (reference-checked) |
| Analytics | `GET /analytics/summary` |

**Response format:** success `{ data: … , meta?: … }`; failure `{ error: { code, message, details?, requestId } }` with 400/401/403/404/409/413/422/423/500. Validation failures return `422 validation_failed` with per-field `details`. Stack traces never leave the process.

**Serializers** (`services/serializers.ts`) are allowlists: public product/review/category/gallery projections omit `adminNotes`, `archivedAt`, `email`, `adminNote`, `status` and `publicId`.

---

## 4. Request pipeline

1. `requestId` (UUID, echoed in `X-Request-Id` and every error body).
2. `helmet` — `default-src 'none'`, `img-src 'self' https:`, CSP frame/script lockdown, `nosniff`, referrer `no-referrer`, HSTS in production.
3. CORS — explicit origin allowlist from `CORS_ORIGINS`; unknown origins receive `403 cors_denied` (regression-tested).
4. `compression`, `express.json({ limit: '100kb' })`, morgan access log with request id.
5. Local `/uploads` static fallback (development only) with immutable cache headers.
6. Router + Zod `validateBody` / `parseQuery` (`.strict()` — unknown keys and operator-injection objects such as `?category[$ne]=x` are rejected).
7. Centralized error handler (Zod → 422, Multer → 413/400, Cast → 400, duplicate key → 409, malformed JSON → 400, entity too large → 413, unknown → generic 500 + `requestId`).

**Caching:** public catalogue/reviews/settings responses send `Cache-Control: public, max-age=30–60, stale-while-revalidate=…`; every admin or cart response is `no-store`.

---

## 5. Frontend architecture

- **Typed API client** (`api/client.ts`): one `request()` wrapper, central `ApiError` with `code/details/requestId`, abortable `useApi` hook (obsolete responses are cancelled), in-memory token holder with a 401 handler that ends the session.
- **Contexts:** `SettingsContext` (single public settings fetch → all brand strings live in one place), `CartContext` (localStorage, schema-validated parse, quantity clamping), `AuthContext` (**JWT in memory only** — a refresh signs the admin out by design), `ToastContext`.
- **Routing:** `StorefrontLayout` wraps all public pages; `RequireAdmin` gates `/admin/*` purely for UX — the API independently enforces authorization on every call.
- **SEO:** `Seo` component sets title/description/canonical/OG per route and safely serializes JSON-LD (`lib/jsonld.ts` escapes `<`, `>`, `&`, U+2028/2029 — regression-tested).
- **Cart → WhatsApp:** cart lines are re-validated against `POST /api/cart/validate` before composing the message; the message is built from settings templates and opened via an encoded `wa.me` link. UI copy states clearly that WhatsApp opens an **enquiry**, not a payment or confirmed order.
- **Service workers / trackers:** none. Telemetry is four anonymous event types with no identifiers.

---

## 6. Design system

Tokens live in `client/tailwind.config.js` + `styles/index.css`, derived from the supplied logo:

| Token | Value | Usage |
| --- | --- | --- |
| `forest` / `forest-dark` / `forest-light` | `#073B24` / `#052D1B` / `#0A4329` | Navigation, buttons, deep sections |
| `gold` / `gold-dark` | `#D9B66F` / `#B98F3E` | Hairline borders, dividers, accents |
| `ivory` / `ivory-dark` / `sage` | `#F8F4E9` / `#F1EBDD` / `#DCE5D8` | Surfaces and soft sections |
| `charcoal` | `#222821` | Body text |
| Type | Cormorant Garamond (headings) + Inter (body), self-hosted via `@fontsource` | No third-party font CDN |

Shared primitives (`components/ui/`) — `Button`, form fields, `Modal`, `Accordion`, `Pagination`, `QuantityStepper`, badges, skeletons, `ErrorState`/`EmptyState` — are the only places these tokens are consumed, so admin and storefront belong to one visual system.

**Brand assets** are generated from the supplied logo file by `scripts/generate-art.mjs` (keyed transparent logo, wordmark, leaf mark, favicon, plus 21 SVG illustrations). The original supplied artwork is preserved under `client/public/brand/`.

---

## 7. Media pipeline

1. Browser checks type/size for fast feedback (JPG/PNG/WebP, 5 MB default).
2. `authenticateAdmin` must pass before multer reads anything (memory storage only).
3. Multer enforces `UPLOAD_MAX_BYTES` and `UPLOAD_MAX_FILES`.
4. Backend verifies **magic bytes** (`utils/imageSignature.ts`) — filenames and MIME types are never trusted.
5. Bytes are stored by Cloudinary in production (`CLOUDINARY_FOLDER`), or an explicit local development fallback (clearly logged, never silent in production — production refuses to boot without Cloudinary credentials).
6. URL + `publicId` are saved on the record and in the `mediaassets` registry.
7. Grids request `f_auto,q_auto,c_limit,w_<width>` transformations; originals are never loaded in listings.
8. Deletion checks product/category/gallery/settings references first and returns `409 image_in_use` while referenced; detached images are cleaned up after a record drops them.

---

## 8. Testing strategy

- `test/setup.ts` boots a throwaway **mongodb-memory-server** per run; no developer or production database is touched.
- `test/helpers.ts` builds the real app, a bcrypt-hashed test owner and factory helpers.
- Coverage: authentication (success/failure/lockout/algorithm pinning/expiry/revocation/logout), production environment validation, CRUD + projection + query injection for products/categories, review moderation, cart validation math, CORS, body limits, malformed JSON, upload authorization and magic bytes, media reference protection, settings URL safety.
- Frontend: cart math and persisted-cart parsing, WhatsApp number/template/message encoding, JSON-LD escaping, formatting and image transformation helpers.
- `scripts/visual-check.mjs`: drives a local Chromium/Edge over 12 desktop routes, 5 mobile routes, the cart→WhatsApp flow and the full admin flow (forced password change → CRUD pages → password restore), recording console errors, broken images, missing `alt`, missing `h1` and horizontal overflow to `.review/qa-report.json` plus screenshots.
