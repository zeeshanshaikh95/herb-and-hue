# Herb & Hue — Deployment Guide

**Nothing in this project has been deployed yet.** No external service has been provisioned, no domain has been registered and no credentials have been created. Follow the steps below with your own accounts; every identifier below is a placeholder (`YOUR_*`).

---

## 0. What goes where

| Variable | Where it lives | Public? |
| --- | --- | --- |
| `JWT_SECRET`, `MONGODB_URI`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `CLOUDINARY_*` | **Backend host only** (Render dashboard) | Never |
| `CORS_ORIGINS`, `PUBLIC_SITE_URL`, `TRUST_PROXY`, `AUTO_SEED` | Backend host | Never |
| `VITE_API_BASE_URL`, `VITE_BASE`, `VITE_PUBLIC_SITE_URL` | Frontend **build** environment | Yes — baked into the bundle |

Anything prefixed `VITE_` is compiled into the JavaScript bundle and readable by anyone. There is no secret-safe frontend variable.

---

## 1. Backend on Render (web service)

1. Create a **Web Service** from the repository root.
2. Settings:
   - **Build command:** `npm ci && npm run build --workspace server`
   - **Start command:** `npm run start --workspace server`
   - **Health check path:** `/api/health` (returns `200` only when the database is connected, `503` otherwise)
   - **Node version:** 22 (see `engines`)
3. Environment (dashboard → Environment):
   ```
   NODE_ENV=production
   PORT=10000                     # Render assigns this; keep its value
   MONGODB_URI=mongodb+srv://…    # from Atlas step 3
   JWT_SECRET=<32+ high-entropy chars>
   JWT_EXPIRES_IN=2h
   CORS_ORIGINS=https://YOUR-DOMAIN,https://YOUR-USER.github.io
   PUBLIC_SITE_URL=https://YOUR-DOMAIN
   PUBLIC_API_URL=https://YOUR-API.onrender.com
   ADMIN_EMAIL=you@YOUR-DOMAIN    # first boot only — remove after the owner exists
   ADMIN_PASSWORD=<strong, 12+ mixed chars>
   AUTO_SEED=false                # seed manually, then set false
   CLOUDINARY_CLOUD_NAME=…
   CLOUDINARY_API_KEY=…
   CLOUDINARY_API_SECRET=…
   CLOUDINARY_FOLDER=herb-and-hue
   UPLOAD_MAX_BYTES=5242880
   UPLOAD_MAX_FILES=6
   TRUST_PROXY=1
   LOG_LEVEL=short
   ```
4. The API **refuses to start** in production if `MONGODB_URI`, a strong `JWT_SECRET`, https `CORS_ORIGINS`, an https `PUBLIC_SITE_URL` or complete Cloudinary credentials are missing or weak — read the startup error and fix the variable.
5. First boot creates the owner account from `ADMIN_EMAIL`/`ADMIN_PASSWORD` (only when the database has no admins). Sign in once, complete the **forced password change**, then **delete both variables** from the dashboard.
6. Seed content with a one-off run: `npm run seed --workspace server` (Render shell or a temporary `AUTO_SEED=true` deploy), then set `AUTO_SEED=false` again.

### Local production check before deploying
```bash
NODE_ENV=production npm run build && npm run start --workspace server
```
Run it once against a scratch database to see the same validation your production host will see.

---

## 2. Frontend on GitHub Pages

1. Push the repository to GitHub (`YOUR-OWNER/herb-and-hue`).
2. Repository → **Settings → Pages → Source: Deploy from a branch**, branch `main`, folder `/docs` is *not* used — instead let the bundled workflow build and publish (`/.github/workflows/ci.yml` runs typecheck, tests and build; add the Pages deployment job below if you want Pages publishing from CI):

   ```yaml
   # add as .github/workflows/pages.yml if desired
   # permissions: contents: read, pages: write, id-token: write
   # steps: npm ci → npm run typecheck → npm test →
   #   env: VITE_API_BASE_URL=https://YOUR-API.onrender.com
   #        VITE_BASE=/${{ github.event.repository.name }}/
   #        VITE_PUBLIC_SITE_URL=https://YOUR-USER.github.io
   #   npm run build --workspace client
   #   upload-pages-artifact path: client/dist  → deploy-pages
   ```
3. **Deep links:** the Vite config already copies `index.html` to `404.html` on build, which is GitHub Pages' SPA fallback.
4. **Custom domain:** add `CNAME` to `client/public/` (e.g. `www.YOUR-DOMAIN`), configure DNS (apex `A` records `185.199.108–111.153`, or `CNAME` for subdomains), enable HTTPS in Pages settings, then set `VITE_BASE=/` and `VITE_PUBLIC_SITE_URL=https://YOUR-DOMAIN`.
5. Add the final origin to the API's `CORS_ORIGINS` (exact scheme/host, no trailing slash) and redeploy the API.

**Alternative:** any static host works (Render Static, Netlify, Cloudflare Pages). For hosts without a 404 fallback, configure a rewrite of `/* → /index.html`.

---

## 3. MongoDB Atlas

1. Create a free M0 cluster at `cloud.mongodb.com`.
2. **Database access:** create a dedicated app user with read/write on a single database (e.g. `herb_hue`) — not `admin`. Store its password in the backend host only.
3. **Network access:** prefer private IP access or the host's static egress IPs (`Render → Settings → Outbound IP addresses`). Avoid `0.0.0.0/0`.
4. Copy the connection string: `mongodb+srv://USER:PASS@CLUSTER.mongodb.net/herb_hue?retryWrites=true&w=majority` → `MONGODB_URI`.
5. **Backups:** Atlas M0 includes snapshots for the retention window; for production data enable continuous backup/PITR and rehearse a restore into a scratch cluster.
6. Indexes are created by Mongoose on first boot (`syncIndexes` behaviour is not automatic for every change — after deploying schema changes, run an index review or `Model.syncIndexes()` from a one-off script).

---

## 4. Cloudinary

1. Create a dedicated **product environment/folder** (`herb-and-hue`) in a Cloudinary account you control.
2. API Key + API Secret + Cloud name → backend environment variables only.
3. Recommended account hygiene: enable restricted media types, set upload presets to disallow arbitrary uploads from the browser (the app never uploads from the browser — all uploads go through the authenticated API), and rotate the secret if it is ever exposed.
4. Development without Cloudinary uses an explicit local fallback directory that is logged at startup; production never falls back silently — it fails startup instead.

---

## 5. Post-deployment verification checklist

- [ ] `GET https://YOUR-API/api/health` → `{"status":"ok","database":"connected"}`
- [ ] Storefront loads, product/category/cart/deep links all render (refresh a deep link directly)
- [ ] `POST /api/products` without a token → `401`; with a token from login → `201`
- [ ] Admin login → forced password change → dashboard; logout invalidates the token
- [ ] Upload a real JPG in the dashboard and confirm a transformed (resized/auto-format) URL is rendered in the storefront
- [ ] Cart → **Review & enquire** opens WhatsApp with the encoded message; a wrong `wa.me` number is not silently used (verify settings)
- [ ] Cross-origin call from a non-allowlisted origin → `403 cors_denied`
- [ ] Browser dev tools → network response headers show `X-Content-Type-Options`, `Referrer-Policy`, no `X-Powered-By`
- [ ] Frontend bundle contains **no** `JWT_SECRET`/`MONGODB_URI`/`CLOUDINARY_*` strings (`grep -R "mongodb+srv" client/dist` → empty)

---

## 6. Rollback

- **Backend:** Render keeps previous deploys — promote the last good one; the database schema is additive, so rolling back the code does not require a data migration.
- **Frontend:** re-run the Pages workflow for the previous commit.
- **Database:** restore an Atlas snapshot into a new cluster and update `MONGODB_URI` (never edit production data in place to "fix" a deploy).
