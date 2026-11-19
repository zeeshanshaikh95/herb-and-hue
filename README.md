# Herb & Hue

A complete e-commerce build for **Herb & Hue**, a premium botanical skincare brand: a customer-facing storefront, a secure admin dashboard, a typed REST API, MongoDB data models, Cloudinary-backed image management and WhatsApp ordering — built from the supplied logo as the brand source of truth.

> **Sample data notice.** The seeded catalogue, gallery items and homepage copy are clearly marked development placeholders (`sampleData` flags and on-page notices). No real product claims, prices, certifications, testimonials or customer reviews ship with this project. The Reviews page is empty until the owner supplies genuine reviews through the dashboard.

---

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, TypeScript, Vite 5, React Router 6, Tailwind CSS 3, react-helmet-async |
| Backend | Node.js 22, Express 4, TypeScript, Mongoose 8, Zod 3, JWT (HS256), bcryptjs |
| Media | Cloudinary (backend only), local storage fallback in development |
| Testing | Vitest, Supertest, mongodb-memory-server, Playwright-core (headless visual QA) |

Exact versions are pinned in [`package.json`](package.json), [`server/package.json`](server/package.json) and [`client/package.json`](client/package.json) with a committed `package-lock.json`.

---

## Quick start

```bash
npm install
cp .env.example .env        # then edit values (see below)
npm run dev                 # API on :4000, storefront on :5173
```

First run with an empty `.env` starts an **ephemeral in-memory MongoDB** (development only) and will warn accordingly. Set `ADMIN_EMAIL` / `ADMIN_PASSWORD` before bootstrapping the first owner account — the account is created once, forces a password change at first sign-in, and is never reset from the environment afterwards.

Seed the sample catalogue:

```bash
npm run seed                # or AUTO_SEED=true npm run dev:server
```

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | API + storefront together |
| `npm run dev:server` / `npm run dev:client` | One workspace only |
| `npm run typecheck` | `tsc --noEmit` for server (src + tests) and client |
| `npm test` | Server + client test suites |
| `npm run build` | Production build of both workspaces |
| `npm run verify` | typecheck → tests → build |
| `npm run assets` | Regenerate brand assets and illustration set from the supplied logo |
| `node scripts/visual-check.mjs` | Headless desktop + mobile visual/functional QA (dev servers must be running) |

> On Windows paths containing `&`, npm's binary shim breaks; every script is routed through `scripts/run.mjs`, which resolves the binary from `node_modules` directly.

---

## Project structure

```text
herb-and-hue/
├── client/                 # Vite React storefront + /admin dashboard
│   ├── public/brand/       # Logo, wordmark, leaf mark, favicon (derived from supplied artwork)
│   ├── public/images/      # Generated editorial, product, category, gallery illustrations
│   └── src/
│       ├── api/            # Typed fetch client, public + admin API modules, DTO types
│       ├── admin/          # Dashboard shell, product/category/review/gallery/settings UI
│       ├── components/     # layout/, products/, ui/ + brand + SEO
│       ├── context/        # Toast, Settings, Cart, Auth (in-memory JWT)
│       ├── hooks/          # useApi (aborting fetch), debounce, body scroll lock
│       ├── lib/            # cart, whatsapp, jsonld, format, images, analytics, links
│       ├── pages/          # Home, Shop, ProductDetail, Categories, About, Reviews, …
│       └── styles/         # Tailwind entry + design tokens
├── server/
│   ├── src/
│   │   ├── config/         # env validation, brand defaults, database
│   │   ├── controllers/    # auth, products, categories, reviews, gallery, settings, uploads, analytics, checkout
│   │   ├── middleware/     # auth, validate (Zod), rate limits, upload, errors, request IDs
│   │   ├── models/         # Admin, Product, Category, Review, GalleryItem, SiteSettings, AnalyticsEvent, MediaAsset
│   │   ├── routes/         # public.ts, admin.ts
│   │   ├── services/       # serializers, settings, media cleanup, upload service, bootstrap
│   │   ├── seed/           # sample catalogue (flagged as sample data)
│   │   ├── validation/     # Zod schemas for every writable endpoint + query strings
│   │   ├── app.ts          # Express app factory (CSP, CORS, compression, limiters)
│   │   └── index.ts        # bootstrapping + graceful shutdown
│   └── test/               # 60 Vitest API/security tests
├── docs/                   # ARCHITECTURE, DEPLOYMENT, SECURITY
├── scripts/                # asset generation + visual QA
└── .github/workflows/      # CI (typecheck, tests, build)
```

---

## Verification results (recorded locally, 2026-10-24)

| Check | Command | Result |
| --- | --- | --- |
| Backend tests | `npm run test --workspace server` | **60 passed / 60**, 5 files, exit 0 |
| Frontend tests | `npm run test --workspace client` | **28 passed / 28**, 3 files, exit 0 |
| Typecheck (both) | `npm run typecheck` | exit 0 |
| Production build | `npm run build` | exit 0 (client bundle 406.79 kB / 114.04 kB gzip; CSS 73.07 kB / 12.00 kB gzip) |
| Visual QA | `node scripts/visual-check.mjs` | 12 desktop routes + 5 mobile routes + admin flow; no broken images, console errors, horizontal overflow or missing alt text |
| Dependency audit (runtime) | `npm audit --omit=dev` | 3 advisories remain — see [docs/SECURITY.md](docs/SECURITY.md) |

Total: **88 automated tests, all passing.**

---

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — data model, API surface, request flow, design system
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — GitHub Pages, Render, MongoDB Atlas, Cloudinary, custom domain
- [docs/SECURITY.md](docs/SECURITY.md) — controls implemented, tested behaviours, advisories and mitigations

## Configuration

All backend variables live in [.env.example](.env.example); frontend build variables live in [client/.env.example](client/.env.example). Never place `JWT_SECRET`, `MONGODB_URI`, admin passwords or Cloudinary secrets in a `VITE_*` variable — the browser bundle is public.
