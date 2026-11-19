# Herb & Hue — Security Notes

Scope: the API in `server/`, the SPA in `client/`, and the operational guidance needed to run them. Every claim below corresponds to code in this repository, and the **Tested** column names the automated test that pins the behaviour (`server/test/*`, `client/test/*`).

---

## 1. Secrets and configuration

| Control | Implemented | Tested |
| --- | --- | --- |
| Strict startup validation in production: `MONGODB_URI`, strong `JWT_SECRET`, https `PUBLIC_SITE_URL`, https (non-wildcard) `CORS_ORIGINS`, complete Cloudinary credentials, strong admin password | `config/env.ts` → `buildConfig()` throws before boot | `config.test.ts` (12 tests) |
| JWT secret strength: ≥32 chars, no placeholder words (`change-me`, `secret`, `example`, …), ≥12 distinct characters, not a repeated character | `isStrongJwtSecret()` | `config.test.ts` |
| Admin bootstrap password policy (12–128, mixed case, number, symbol) and explicit placeholder rejection | `isStrongPassword()` | `config.test.ts` |
| Development-only fallback JWT secret is impossible to use in production and is announced as a warning locally | `DEV_JWT_SECRET` branch | `config.test.ts` |
| No secrets in the frontend bundle: only `VITE_*` values are compiled in; `.env` and friends are git-ignored | `.gitignore`, `client/src/lib/env.ts` | manual step in DEPLOYMENT checklist |
| `.env.example` contains placeholder names only | committed | — |

## 2. Authentication and sessions

| Control | Implemented | Tested |
| --- | --- | --- |
| HS256 pinned (`algorithms: ['HS256']`), `iss`/`aud` pinned, 2 h expiry | `utils/authToken.ts` | `auth.test.ts` (wrong algorithm → 401) |
| bcrypt cost-12 hashing; `passwordHash` never selected by default and never serialized | `models/Admin.ts`, `controllers/authController.ts` | `auth.test.ts` |
| Revocation: `tokenVersion` bump on password change **and** logout; every request re-checks it against the database | `middleware/auth.ts` | `auth.test.ts` (old token → `session_revoked`) |
| Expired and forged tokens rejected with generic codes | `verifyAdminToken()` | `auth.test.ts` (wrong secret, expired) |
| Forced password change at first sign-in (`mustChangePassword`) | model default + `RequireAdmin` UI | `auth.test.ts` |
| Account lockout: 5 consecutive failures → 423 for 15 minutes; identical error for unknown email vs wrong password | `login()` | `auth.test.ts` |
| Login rate limit 10/15 min; admin writes 300/10 min; public writes 30/10 min; analytics 150/10 min | `middleware/rateLimit.ts` | skipped only when `NODE_ENV=test` |
| **Frontend token held in memory only** — no localStorage/sessionStorage token for XSS to read; refresh ends the session by design | `context/AuthContext.tsx` | code-enforced |
| Server-side authorization on every privileged route (`authenticateAdmin` mounted before all admin endpoints) — UI route guards are UX only | `routes/admin.ts` | `auth.test.ts`, `catalog.test.ts`, `security.test.ts` (401s) |

## 3. Input handling

| Control | Implemented | Tested |
| --- | --- | --- |
| Zod `.strict()` validation on every body, query and path param — unknown keys rejected | `validation/schemas.ts`, `middleware/validate.ts` | `catalog.test.ts`, `reviews-checkout.test.ts` |
| NoSQL injection: operator objects in query strings fail string validation → 422 | same | `catalog.test.ts` (`?category[$ne]=…`) |
| Prices/quantities are bounded integers in minor units; compare-at must exceed price | Zod + schema validators | `catalog.test.ts` |
| URL safety: image URLs must be http(s) or an absolute in-app path; link fields accept in-app `/paths` or http(s) only; `javascript:` rejected | `models/shared.ts`, `utils/safeUrl.ts`, `schemas.ts` | `catalog.test.ts`, `security.test.ts` |
| Body size limit 100 kb → 413; malformed JSON → 400 with a safe code | `app.ts`, `middleware/error.ts` | `security.test.ts` |
| Errors are sanitized: stable `{code,message,details,requestId}`, no stack traces, `X-Powered-By` disabled | `middleware/error.ts` | `security.test.ts` |

## 4. HTTP hardening

- **Helmet** with `default-src 'none'`, `img-src 'self' https:`, no inline styles/scripts from the API, `frame-ancestors 'none'`, `Referrer-Policy: no-referrer`, HSTS in production.
- **CORS** explicit allowlist; unlisted origins get `403 cors_denied` and no `Access-Control-Allow-Origin` header; `credentials: false` (bearer tokens, no cookies).
- **Rate limiting** with `RateLimit`/`RateLimit-Policy` draft-7 headers; `TRUST_PROXY=1` behind Render/nginx so limits key on the real client IP.
- `X-Content-Type-Options: nosniff` on static uploads, immutable caching for local dev media.
- Admin responses and cart validation are always `Cache-Control: no-store`; public catalogue responses are short-lived `public` caches that never contain admin fields.

## 5. Uploads and media

1. Authentication required before multer reads the request (`authenticateAdmin` runs first).
2. Multer memory storage only — nothing touches a public directory before validation; `UPLOAD_MAX_BYTES` (default 5 MB) and `UPLOAD_MAX_FILES` (default 6) enforced.
3. Extension **and** MIME allowlist (`.jpg/.jpeg/.png/.webp`), then **magic-byte verification** of the actual content (`FF D8 FF`, PNG signature, `RIFF…WEBP`); anything else → `400 unsupported_file_type`.
4. SVG and other active content types are rejected (stored images can never become script execution vectors).
5. Deletion is reference-checked against products, categories, gallery and settings before destroying a Cloudinary asset (`409 image_in_use`).
6. Cloudinary credentials exist only on the server; the browser receives transformed delivery URLs.

Tested in `security.test.ts` (auth required, fake PNG bytes, SVG rejection, signature classifier, reference guard).

## 6. Frontend safety

- **JSON-LD escaping:** `<`, `>`, `&`, U+2028 and U+2029 are escaped before injection into `<script type="application/ld+json">`, and the result is verified to remain valid JSON (`client/test/seo.test.ts`).
- **WhatsApp links** are built from validated international numbers (8–15 digits) and `encodeURIComponent`-encoded messages; a missing/invalid number renders a graceful "not configured" state instead of a broken link (`whatsapp.test.ts`).
- **Cart persistence** is parsed defensively — wrong shapes, non-numbers and junk entries are dropped rather than trusted (`cart.test.ts`).
- No `dangerouslySetInnerHTML`, no third-party scripts, no trackers, no service worker.
- External links use `rel="noopener noreferrer"`.

## 7. Data exposure

- Public serializers are explicit allowlists: `adminNotes`, `archivedAt`, review `email`/`adminNote`/`status`, image `publicId` never appear in public responses (`services/serializers.ts`, asserted in `catalog.test.ts`).
- Settings public projection is a separate allowlist function (`toPublicSettings`).
- Analytics events store no identifiers: type, path, optional product slug, referrer host only, with a 90-day TTL.
- Sample catalogue is flagged (`sampleData`) and no fake reviews are ever seeded — the seed script writes **no** review documents.

## 8. Dependency advisories (recorded 2026-10-24)

`npm audit --omit=dev` → **3 advisories (2 moderate, 1 high)** after remediation:

| Package | Advisory | Status / mitigation |
| --- | --- | --- |
| `multer` (was 2.0.2) | DoS family — GHSA-xf7r…, GHSA-52c…, size-limit bypass, etc. | **Fixed** by upgrading to `2.5.0`; server tests re-run green (60/60) |
| `morgan` (was 1.10.0) + `on-headers` | Log forging / header manipulation | **Fixed** by upgrading to `1.12.1` |
| `zod` 3.x → `zod@4` fix | Memory exhaustion validating oversized constrained collections (GHSA-mrhx-c7xc-m3w5) | **Accepted, mitigated:** every request body is capped at **100 kb** by `express.json`, all collections are bounded (`max 10/50/…`) before iteration, and requests are rate-limited. Fixing requires the breaking Zod v4 migration — tracked as follow-up work. |
| `react-router` 6.x → `react-router@7` fix | Open redirect via backslash in `<Link>`/`useNavigate`; SSR hydration constructor injection (GHSA-wrjc-x8rr-h8h6, GHSA-337j-9hxr-rhxg) | **Accepted, mitigated:** this app is a pure CSR SPA (the SSR-hydration advisory does not apply), all internal link targets are static constants from `NAV_LINKS`/`ADMIN_NAV` and route params — no user-supplied destinations are passed to `Link`/`navigate`. Fixing requires React Router v7 (breaking major) — tracked as follow-up work. |

Dev-only advisories (14 additional findings under `npm audit` full report) come from build tooling and never ship in the production bundle.

Run `npm audit` after any dependency change; do not silence advisories with `--omit` flags.

## 9. Operational checklist

- [ ] `JWT_SECRET` generated with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` and stored only in the backend host
- [ ] `ADMIN_EMAIL`/`ADMIN_PASSWORD` removed from the environment after first owner bootstrap
- [ ] Owner password rotated in the dashboard (forces `tokenVersion` bump for all sessions)
- [ ] Atlas user is least-privilege and not reachable from `0.0.0.0/0`
- [ ] Cloudinary secret rotated if it ever appears in a log, ticket or screenshot
- [ ] `TRUST_PROXY=1` set behind Render/nginx so rate limits key on real client IPs
- [ ] Re-run `npm test`, `npm run typecheck` and `npm audit --omit=dev` before each release

## 10. Not implemented (out of scope by design)

- No payment processing — ordering completes as a WhatsApp enquiry; the UI never claims payment or confirmation.
- No email delivery, password reset flow or 2FA — there is a single owner account managed through the dashboard and the forced-change flow. If multi-admin self-service is added, add reset tokens with short expiry and single-use semantics first.
- No CSP on the SPA beyond Helmet's API responses (static hosting is responsible for HTML headers); recommend adding a strict `Content-Security-Policy` at the Pages/host layer.
