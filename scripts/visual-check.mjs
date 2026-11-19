/**
 * Headless visual + functional QA using a locally installed Chromium browser.
 *
 * Usage: node scripts/visual-check.mjs
 * Requires the API (4000) and Vite (5173) dev servers, plus Microsoft Edge or
 * Chrome. Screenshots are written to .review/qa for human review.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, '.review', 'qa');
const base = process.env.QA_BASE || 'http://localhost:5173';
const browserPath =
  process.env.BROWSER_PATH ||
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const routes = [
  { path: '/', name: 'home' },
  { path: '/shop', name: 'shop' },
  { path: '/product/radiance-face-serum', name: 'product' },
  { path: '/categories', name: 'categories' },
  { path: '/category/treat', name: 'category' },
  { path: '/about', name: 'about' },
  { path: '/reviews', name: 'reviews' },
  { path: '/gallery', name: 'gallery' },
  { path: '/contact', name: 'contact' },
  { path: '/cart', name: 'cart-empty' },
  { path: '/this-route-does-not-exist', name: 'not-found' },
  { path: '/admin/login', name: 'admin-login' },
];

const mobileRoutes = ['/', '/shop', '/product/radiance-face-serum', '/cart', '/admin/login'];

const issues = [];
const report = [];

function record(route, kind, detail) {
  issues.push({ route, kind, detail });
}

async function loadEnv() {
  try {
    const raw = await readFile(path.join(root, '.env'), 'utf8');
    const values = {};
    for (const line of raw.split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match) values[match[1]] = match[2];
    }
    return values;
  } catch {
    return {};
  }
}

async function inspect(page, route, name, viewportLabel) {
  const consoleErrors = [];
  const onConsole = (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  };
  const onPageError = (error) => consoleErrors.push(error.message);
  page.on('console', onConsole);
  page.on('pageerror', onPageError);

  await page.goto(`${base}${route}`, { waitUntil: 'networkidle', timeout: 45_000 });
  await page.waitForTimeout(500);

  const metrics = await page.evaluate(() => {
    const images = [...document.images];
    return {
      title: document.title,
      h1: document.querySelector('h1')?.textContent?.trim().replace(/\s+/g, ' ') ?? '',
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      brokenImages: images.filter((img) => img.complete && img.naturalWidth === 0).map((img) => img.currentSrc || img.src),
      missingAlt: images.filter((img) => !img.hasAttribute('alt')).length,
      buttons: document.querySelectorAll('button').length,
      pageHeight: document.documentElement.scrollHeight,
      horizontalScrollable: document.documentElement.scrollWidth > window.innerWidth + 2,
    };
  });

  for (const message of consoleErrors) {
    if (message.includes('Download the React DevTools') || message.includes('React Router Future Flag')) continue;
    record(route, 'console', message.slice(0, 400));
  }
  for (const image of metrics.brokenImages) record(route, 'broken-image', image);
  if (metrics.overflow > 2) record(route, 'horizontal-overflow', `${metrics.overflow}px`);
  if (metrics.missingAlt > 0) record(route, 'missing-alt', String(metrics.missingAlt));
  if (!metrics.h1) record(route, 'missing-h1', 'No h1 found');

  const file = path.join(outDir, `${viewportLabel}-${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  report.push({ viewport: viewportLabel, route, ...metrics, screenshot: path.relative(root, file) });

  page.off('console', onConsole);
  page.off('pageerror', onPageError);
}

async function cartFlow(page) {
  const route = '/cart (flow)';
  await page.goto(`${base}/product/radiance-face-serum`, { waitUntil: 'networkidle' });
  const addButton = page.getByRole('button', { name: /add to bag/i });
  if ((await addButton.count()) === 0) {
    record(route, 'flow', 'Add to bag button not found');
    return;
  }
  await addButton.first().click();
  await page.waitForTimeout(400);
  const bagLabel = await page.locator('header a[href="/cart"]').first().getAttribute('aria-label');
  if (!bagLabel || !/1 item/i.test(bagLabel)) record(route, 'flow', `Bag label unexpected: ${bagLabel}`);

  await page.goto(`${base}/cart`, { waitUntil: 'networkidle' });
  const subtotal = await page.locator('aside').first().innerText().catch(() => '');
  if (!/\$\d/.test(subtotal)) record(route, 'flow', 'Subtotal not rendered');

  await page.getByRole('button', { name: /review & enquire/i }).click();
  await page.waitForTimeout(500);
  const nameError = await page.locator('#cart-name-error').count();
  if (nameError === 0) record(route, 'flow', 'Name validation did not block enquiry');
  else report.push({ viewport: 'desktop', route, nameValidation: 'ok' });

  await page.fill('#cart-name', 'QA Test');
  const popupPromise = page.waitForEvent('popup', { timeout: 8000 }).catch(() => null);
  await page.getByRole('button', { name: /review & enquire/i }).click();
  const popup = await popupPromise;
  if (!popup) {
    record(route, 'flow', 'WhatsApp popup did not open');
  } else {
    const url = popup.url();
    if (!/^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(url)) record(route, 'flow', `Unexpected WhatsApp URL: ${url.slice(0, 80)}`);
    if (!/Herb%20%26%20Hue|Herb\+%26\+Hue/i.test(url)) record(route, 'flow', 'WhatsApp message missing brand');
    await popup.close();
    report.push({ viewport: 'desktop', route, whatsapp: 'opened with encoded message' });
  }

  await page.screenshot({ path: path.join(outDir, 'desktop-cart-filled.png'), fullPage: true });
}

async function apiJson(url, body, token) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return { status: response.status, json: await response.json().catch(() => null) };
}

/** Restore the owner password after the forced-change check so .env stays valid. */
async function restoreAdminPassword(env, temporaryPassword) {
  const api = process.env.QA_API || 'http://localhost:4000';
  const login = await apiJson(`${api}/api/admin/auth/login`, {
    email: env.ADMIN_EMAIL,
    password: temporaryPassword,
  });
  if (login.status !== 200) return `temporary sign-in failed (${login.status})`;
  const restore = await apiJson(
    `${api}/api/admin/auth/change-password`,
    { currentPassword: temporaryPassword, newPassword: env.ADMIN_PASSWORD },
    login.json?.data?.token,
  );
  if (restore.status !== 200) return `restore failed (${restore.status})`;
  const verify = await apiJson(`${api}/api/admin/auth/login`, {
    email: env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD,
  });
  return verify.status === 200 ? null : `original password rejected after restore (${verify.status})`;
}

async function adminFlow(browser, env) {
  const route = '/admin (flow)';
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await page.goto(`${base}/admin/login`, { waitUntil: 'networkidle' });
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    record(route, 'flow', 'Admin credentials not available in .env (skipped)');
    await context.close();
    return;
  }
  await page.fill('#admin-email', env.ADMIN_EMAIL);
  await page.fill('#admin-password', env.ADMIN_PASSWORD);
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await page.waitForTimeout(1800);
  console.log(`admin: after sign-in → ${page.url()}`);

  let temporaryPassword = null;
  const heading = await page.locator('h1').first().innerText().catch(() => '');
  if (/choose a new password/i.test(heading)) {
    await page.screenshot({ path: path.join(outDir, 'desktop-admin-force-password.png'), fullPage: true });
    temporaryPassword = `Qa-${Math.random().toString(36).slice(2, 10)}!${Math.random().toString(36).slice(2, 8)}Aa1`;
    await page.fill('#current-password', env.ADMIN_PASSWORD);
    await page.fill('#new-password', temporaryPassword);
    await page.fill('#confirm-password', temporaryPassword);
    await page.getByRole('button', { name: /update password/i }).click();
    await page.waitForURL(/\/admin$/, { timeout: 15_000 }).catch(() => null);
    if (!/\/admin$/.test(new URL(page.url()).pathname)) {
      record(route, 'flow', 'Forced password change did not unlock the dashboard');
      await context.close();
      return;
    }
    console.log('admin: forced password change completed');
    report.push({ viewport: 'desktop', route, forcedPasswordChange: 'unlocked dashboard' });
  } else if (/sign in to the dashboard/i.test(heading) || (await page.locator('#admin-email').count())) {
    record(route, 'flow', 'Login failed — check admin credentials');
    await context.close();
    return;
  }

  await page.waitForTimeout(1200);
  console.log(`admin: dashboard heading "${await page.locator('h1').first().innerText().catch(() => '')}"`);
  await page.screenshot({ path: path.join(outDir, 'desktop-admin-dashboard.png'), fullPage: true });

  // The JWT lives in memory, so navigate with in-app links rather than reloads.
  for (const [name, pathName] of [
    ['products', '/admin/products'],
    ['categories', '/admin/categories'],
    ['reviews', '/admin/reviews'],
    ['gallery', '/admin/gallery'],
    ['settings', '/admin/settings'],
  ]) {
    await page.click(`aside a[href="${pathName}"]`);
    await page.waitForURL(new RegExp(`${pathName}$`), { timeout: 10_000 }).catch(() => null);
    await page.waitForTimeout(600);
    if (!page.url().endsWith(pathName)) record(route, 'admin-route', `Could not reach ${pathName}`);
    const bodyText = await page.locator('main').innerText().catch(() => '');
    if (/something went wrong|unexpected error/i.test(bodyText)) record(route, 'admin-error', pathName);
    if (/sign in to the dashboard/i.test(bodyText)) record(route, 'admin-session', `Session lost at ${pathName}`);
    console.log(`admin: ${pathName} → ${page.url()}`);
    await page.screenshot({ path: path.join(outDir, `desktop-admin-${name}.png`), fullPage: true });
  }

  // Mobile admin shell + drawer navigation
  await page.setViewportSize({ width: 390, height: 844 });
  await page.click('button[aria-label="Open admin menu"]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, 'mobile-admin-menu.png'), fullPage: false });
  await page.click('div[aria-hidden="false"] a[href="/admin/products"]');
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(outDir, 'mobile-admin-products.png'), fullPage: true });
  await context.close();

  if (temporaryPassword) {
    const failure = await restoreAdminPassword(env, temporaryPassword);
    if (failure) {
      record(route, 'flow', `Password restore: ${failure}`);
    } else {
      console.log('admin: owner password restored');
      report.push({ viewport: 'desktop', route, passwordRestore: 'owner password restored' });
    }
  }
}

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: browserPath, headless: true });
const env = await loadEnv();

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // Clear persisted state once rather than on every document load, which would
  // wipe the cart between the product page and the cart page.
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.localStorage.clear());

  const only = process.env.QA_ONLY;

  if (only !== 'admin') {
    for (const route of routes) {
      await inspect(page, route.path, route.name, 'desktop');
    }
    await cartFlow(page);
  }
  await context.close();

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobile.newPage();
  await mobilePage.emulateMedia({ reducedMotion: 'reduce' });
  await mobilePage.goto(base, { waitUntil: 'domcontentloaded' });
  await mobilePage.evaluate(() => window.localStorage.clear());
  if (only !== 'admin') {
    for (const route of mobileRoutes) {
      const name = routes.find((entry) => entry.path === route)?.name ?? route.replace(/\W+/g, '-');
      await inspect(mobilePage, route, name, 'mobile');
    }
  }
  await mobile.close();

  if (only !== 'store') await adminFlow(browser, env);
} catch (error) {
  record('runner', 'crash', error instanceof Error ? error.message : String(error));
} finally {
  await browser.close();
  await writeFile(path.join(root, '.review', 'qa-report.json'), JSON.stringify({ issues, report }, null, 2));
}

const blocking = issues.filter((issue) => issue.kind !== 'missing-h1');
console.log(`Routes checked: ${report.length}`);
console.log(`Issues: ${issues.length}`);
for (const issue of issues) console.log(`- [${issue.kind}] ${issue.route}: ${issue.detail}`);
for (const row of report) {
  console.log(`✓ ${row.viewport} ${row.route} — h1="${(row.h1 ?? '').slice(0, 60)}" height=${row.pageHeight ?? '-'}`);
}
if (blocking.length > 0) process.exitCode = 1;
