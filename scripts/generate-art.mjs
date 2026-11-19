/**
 * Herb & Hue — brand asset and illustration generator.
 *
 * The supplied logo is the source of truth: this script derives a transparent
 * wordmark, a standalone leaf mark and a favicon from it, then draws the
 * botanical SVG art used across the storefront. Everything is deterministic so
 * the generated files can be committed and reviewed.
 *
 * Run: node scripts/generate-art.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const brandDir = path.join(root, 'client/public/brand');
const imagesDir = path.join(root, 'client/public/images');
// New logo replaces the old square logo and leaf icon.
const logoPath = path.join(brandDir, 'new-logo.png');

const FOREST = '#073B24';
const FOREST_DARK = '#052D1B';
const GOLD = '#D9B66F';
const IVORY = '#F8F4E9';
const SAGE = '#DCE5D8';

/**
 * Samples the outer frame of the artwork and returns the median background
 * colour. The supplied logo is gold/cream type on a flat forest-green field,
 * so the frame is a reliable sample of the colour that must become transparent.
 */
function estimateBackground(data, width, height, channels) {
  const ring = Math.max(4, Math.round(Math.min(width, height) * 0.04));
  const samples = [[], [], []];
  const median = (values) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      if (x >= ring && y >= ring && x < width - ring && y < height - ring) continue;
      const i = (y * width + x) * channels;
      samples[0].push(data[i]);
      samples[1].push(data[i + 1]);
      samples[2].push(data[i + 2]);
    }
  }

  return { r: median(samples[0]), g: median(samples[1]), b: median(samples[2]) };
}

/**
 * Removes the flat background without touching the lettering.
 *
 * Each pixel's alpha comes from how far it sits from the background colour: a
 * plain background pixel is fully transparent, a solid gold/cream pixel is
 * fully opaque, and anti-aliased rim pixels get a proportional alpha. The RGB
 * of partially transparent pixels is then un-multiplied so edges keep the
 * lettering colour instead of a dark fringe.
 */
function keyOutBackground(data, width, height, channels, background) {
  const LOW = 16; // at or below this distance the pixel is untouched background
  const HIGH = 128; // at or beyond this distance the pixel is solid artwork
  const out = Buffer.alloc(width * height * 4);

  for (let p = 0; p < width * height; p += 1) {
    const i = p * channels;
    const o = p * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const distance = Math.sqrt((r - background.r) ** 2 + (g - background.g) ** 2 + (b - background.b) ** 2);
    const alpha = Math.min(1, Math.max(0, (distance - LOW) / (HIGH - LOW)));

    if (alpha === 0) {
      out[o + 3] = 0;
      continue;
    }

    const unmultiply = (value, base) =>
      Math.min(255, Math.max(0, Math.round(base + (value - base) / alpha)));
    out[o] = unmultiply(r, background.r);
    out[o + 1] = unmultiply(g, background.g);
    out[o + 2] = unmultiply(b, background.b);
    out[o + 3] = Math.round(alpha * 255);
  }

  return out;
}

async function deriveBrandAssets() {
  const meta = await sharp(logoPath).metadata();

  // 1. Square favicon — dark forest-green background with the logo cropped in.
  const faviconSize = 512;
  await sharp(logoPath)
    .resize(faviconSize, faviconSize, { fit: 'contain', background: FOREST })
    .png({ compressionLevel: 9 })
    .toFile(path.join(brandDir, 'favicon.png'));

  await sharp(path.join(brandDir, 'favicon.png'))
    .resize(180, 180)
    .png()
    .toFile(path.join(brandDir, 'apple-touch-icon.png'));

  // 2. Derive a transparent wordmark from the supplied artwork. The logo is
  //    gold/cream lettering on a solid forest-green square, so pasting it into
  //    the header leaves a visible rectangle. Keying the background out (rather
  //    than cropping it) lets the artwork sit on the header, the footer and the
  //    mobile drawer without repainting the brand colours.
  const raw = await sharp(logoPath).raw().toBuffer({ resolveWithObject: true });
  const channels = raw.info.channels;
  const background = estimateBackground(raw.data, raw.info.width, raw.info.height, channels);
  const keyed = keyOutBackground(raw.data, raw.info.width, raw.info.height, channels, background);

  const artwork = await sharp(keyed, {
    raw: { width: raw.info.width, height: raw.info.height, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toBuffer();

  const { info: bounds } = await sharp(artwork).trim({ threshold: 8 }).toBuffer({ resolveWithObject: true });
  const pad = Math.max(2, Math.round(bounds.height * 0.04));
  const wordmark = await sharp(artwork)
    .trim({ threshold: 8 })
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(path.join(brandDir, 'herb-and-hue-wordmark.png'), wordmark);

  const wordmarkMeta = await sharp(wordmark).metadata();
  console.log(
    `wordmark transparent ${wordmarkMeta.width}x${wordmarkMeta.height} (background ${background.r},${background.g},${background.b})`,
  );

  // 3. The full-square logo asset used on dark surfaces (ChangePassword,
  //    hero card) must mirror the new logo — never the old artwork.
  const logoContents = await sharp(logoPath).png({ compressionLevel: 6 }).toBuffer();
  await writeFile(path.join(brandDir, 'herb-and-hue-logo.png'), logoContents);

  // Note: leaf-mark.png is no longer generated — the new logo has no leaf icon.
  // Decorative leaf usage in the UI is served from the existing leaf-mark.png
  // and is intentionally left untouched by this generator.
}

/* ------------------------------------------------------------------ */
/* Illustrations                                                       */
/* ------------------------------------------------------------------ */

const grain = `
  <filter id="grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" result="n"/>
    <feColorMatrix type="saturate" values="0" in="n" result="g"/>
    <feComponentTransfer in="g" result="gg"><feFuncA type="linear" slope="0.045"/></feComponentTransfer>
    <feBlend in="SourceGraphic" in2="gg" mode="multiply"/>
  </filter>`;

const leaf = (x, y, scale, rotate, fill, opacity = 1) => `
  <g transform="translate(${x} ${y}) rotate(${rotate}) scale(${scale})" opacity="${opacity}">
    <path d="M0 0 C 26 -34 74 -44 112 -20 C 120 34 74 66 24 48 C 8 42 0 22 0 0 Z" fill="${fill}"/>
    <path d="M4 2 C 40 4 78 6 110 -18" fill="none" stroke="${FOREST_DARK}" stroke-opacity="0.25" stroke-width="1.6"/>
    <path d="M22 12 C 36 26 56 36 78 38" fill="none" stroke="${FOREST_DARK}" stroke-opacity="0.16" stroke-width="1.2"/>
  </g>`;

function bottle({ width = 900, height = 1100, glass = '#C9A227', label = IVORY, ink = FOREST_DARK, cap = GOLD, text = 'HERB &amp; HUE' }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1100" role="img">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="#F3EEE1"/><stop offset="0.55" stop-color="#EDE6D5"/><stop offset="1" stop-color="#DFD6C1"/>
    </linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${glass}" stop-opacity="0.95"/>
      <stop offset="0.35" stop-color="#8A6A1B"/>
      <stop offset="0.62" stop-color="${glass}"/>
      <stop offset="1" stop-color="#5C4410"/>
    </linearGradient>
    <linearGradient id="cap" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#A9822F"/><stop offset="0.35" stop-color="#EFD9A8"/><stop offset="1" stop-color="#9C7726"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.32" r="0.7">
      <stop offset="0" stop-color="#FFFDF6" stop-opacity="0.9"/><stop offset="1" stop-color="#FFFDF6" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="18"/></filter>
    <filter id="shadow"><feGaussianBlur stdDeviation="26"/></filter>
    ${grain}
  </defs>
  <g filter="url(#grain)">
    <rect width="900" height="1100" fill="url(#bg)"/>
    <ellipse cx="470" cy="330" rx="420" ry="380" fill="url(#glow)"/>
    <ellipse cx="450" cy="930" rx="300" ry="52" fill="#3A3220" opacity="0.16" filter="url(#shadow)"/>
    <path d="M120 860 C 150 700 250 640 330 560" stroke="${FOREST}" stroke-opacity="0.5" stroke-width="4" fill="none"/>
    ${leaf(300, 640, 1.35, -24, FOREST, 0.5)}
    ${leaf(120, 780, 1.1, 18, FOREST, 0.35)}
    <path d="M700 840 C 660 720 640 640 600 560" stroke="${FOREST}" stroke-opacity="0.35" stroke-width="3" fill="none"/>
    ${leaf(560, 620, 0.95, 160, FOREST, 0.28)}
    <!-- bottle -->
    <g transform="translate(450 620) scale(1.95) translate(-450 -620)">
      <rect x="365" y="600" width="170" height="300" rx="18" fill="url(#glass)"/>
      <rect x="398" y="380" width="104" height="230" rx="14" fill="url(#glass)"/>
      <rect x="382" y="330" width="136" height="64" rx="12" fill="url(#cap)"/>
      <rect x="410" y="296" width="80" height="44" rx="6" fill="#2A2118" opacity="0.85"/>
      <rect x="388" y="656" width="124" height="176" rx="6" fill="${label}" opacity="0.96"/>
      <text x="450" y="716" text-anchor="middle" font-family="Georgia, serif" font-size="17" letter-spacing="2.4" fill="${ink}">${text}</text>
      <line x1="412" y1="734" x2="488" y2="734" stroke="${GOLD}" stroke-width="1.2"/>
      <text x="450" y="760" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="10" letter-spacing="3.4" fill="#5A6157">BOTANICAL</text>
      <text x="450" y="784" text-anchor="middle" font-family="Georgia, serif" font-size="21" fill="${ink}">Ritual</text>
      <text x="450" y="812" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="9" letter-spacing="2.6" fill="#5A6157">30 ML / 1 FL OZ</text>
      <rect x="365" y="600" width="26" height="300" rx="14" fill="#FFFFFF" opacity="0.22"/>
      <rect x="398" y="380" width="14" height="230" rx="8" fill="#FFFFFF" opacity="0.28"/>
    </g>
    <path d="M470 296 C 530 210 620 200 700 240" stroke="${FOREST}" stroke-opacity="0.4" stroke-width="3" fill="none"/>
    ${leaf(600, 210, 0.8, -38, GOLD, 0.75)}
  </g>
</svg>`;
}

function jar() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1100" role="img">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.5" y2="1"><stop offset="0" stop-color="#F6F2E7"/><stop offset="1" stop-color="#E2DAC8"/></linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FBF8EF"/><stop offset="0.5" stop-color="#E7DFCB"/><stop offset="1" stop-color="#CEC3AA"/></linearGradient>
    <linearGradient id="cap" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#06301D"/><stop offset="0.5" stop-color="#0B4A2D"/><stop offset="1" stop-color="#041F12"/></linearGradient>
    <filter id="shadow"><feGaussianBlur stdDeviation="24"/></filter>
    ${grain}
  </defs>
  <g filter="url(#grain)">
    <rect width="900" height="1100" fill="url(#bg)"/>
    <ellipse cx="450" cy="900" rx="300" ry="46" fill="#3A3220" opacity="0.15" filter="url(#shadow)"/>
    ${leaf(215, 700, 1.5, 168, FOREST, 0.22)}
    ${leaf(690, 300, 1.3, -8, FOREST, 0.16)}
    <g transform="translate(450 585)">
      <ellipse cx="0" cy="250" rx="230" ry="34" fill="#3A3220" opacity="0.16" filter="url(#shadow)"/>
      <rect x="-190" y="-80" width="380" height="330" rx="40" fill="url(#glass)"/>
      <rect x="-198" y="-140" width="396" height="72" rx="20" fill="url(#cap)"/>
      <rect x="-198" y="-140" width="396" height="12" rx="6" fill="#FFFFFF" opacity="0.14"/>
      <rect x="-190" y="-80" width="52" height="330" rx="26" fill="#FFFFFF" opacity="0.3"/>
      <rect x="118" y="-60" width="42" height="280" rx="21" fill="#0B2A1A" opacity="0.07"/>
      <rect x="-112" y="-16" width="224" height="196" rx="8" fill="#F8F4E9" opacity="0.94"/>
      <text x="0" y="34" text-anchor="middle" font-family="Georgia, serif" font-size="30" letter-spacing="1" fill="${FOREST}">Herb &amp; Hue</text>
      <line x1="-70" y1="56" x2="70" y2="56" stroke="${GOLD}" stroke-width="1"/>
      <text x="0" y="92" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="11" letter-spacing="4" fill="#5A6157">BOTANICAL BALM</text>
      <text x="0" y="126" text-anchor="middle" font-family="Georgia, serif" font-size="16" letter-spacing="2" fill="${GOLD}">30 g</text>
      <circle cx="0" cy="-104" r="22" fill="none" stroke="${GOLD}" stroke-width="1.2" opacity="0.9"/>
      <text x="0" y="-97" text-anchor="middle" font-family="Georgia, serif" font-size="18" fill="${GOLD}">H</text>
    </g>
    ${leaf(690, 760, 1.25, -18, FOREST, 0.3)}
    ${leaf(250, 930, 1.05, 188, GOLD, 0.55)}
  </g>
</svg>`;
}

function editorialHero() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1250" role="img">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0.2" y2="1">
      <stop offset="0" stop-color="#FBF8F0"/><stop offset="0.45" stop-color="#F1EBDD"/><stop offset="1" stop-color="#DCE5D8"/>
    </linearGradient>
    <linearGradient id="arch" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0A4329"/><stop offset="1" stop-color="#052D1B"/>
    </linearGradient>
    <linearGradient id="bottle" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#E8D6A7"/><stop offset="0.3" stop-color="#B98F3E"/>
      <stop offset="0.58" stop-color="#E4C98F"/><stop offset="1" stop-color="#7C5C1E"/>
    </linearGradient>
    <linearGradient id="stone" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0" stop-color="#F5F1E6"/><stop offset="1" stop-color="#CFC9B8"/>
    </linearGradient>
    <radialGradient id="sun" cx="0.72" cy="0.16" r="0.5">
      <stop offset="0" stop-color="#FFFDF4" stop-opacity="0.95"/><stop offset="1" stop-color="#FFFDF4" stop-opacity="0"/>
    </radialGradient>
    <filter id="blur1"><feGaussianBlur stdDeviation="16"/></filter>
    <filter id="blur2"><feGaussianBlur stdDeviation="40"/></filter>
    <filter id="shadow"><feGaussianBlur stdDeviation="18"/></filter>
    ${grain}
  </defs>
  <g filter="url(#grain)">
    <rect width="1000" height="1250" fill="url(#sky)"/>
    <ellipse cx="760" cy="220" rx="520" ry="440" fill="url(#sun)"/>
    <path d="M150 1210 L150 520 C150 300 330 210 500 210 C670 210 850 300 850 520 L850 1210 Z" fill="url(#arch)" opacity="0.97"/>
    <path d="M196 1210 L196 530 C196 330 350 254 500 254 C650 254 804 330 804 530 L804 1210 Z" fill="#0A3C25" opacity="0.55"/>
    <ellipse cx="500" cy="960" rx="330" ry="70" fill="#0B2A1A" opacity="0.35" filter="url(#blur2)"/>
    <!-- stone plinth -->
    <path d="M255 1210 L290 1000 L720 1000 L760 1210 Z" fill="url(#stone)"/>
    <path d="M290 1000 L720 1000 L714 1034 L296 1034 Z" fill="#FFFDF4" opacity="0.55"/>
    <!-- bottle -->
    <g>
      <rect x="392" y="452" width="200" height="360" rx="24" fill="url(#bottle)"/>
      <rect x="430" y="300" width="124" height="170" rx="18" fill="url(#bottle)"/>
      <rect x="414" y="248" width="156" height="72" rx="14" fill="#D9B66F"/>
      <rect x="444" y="214" width="96" height="46" rx="8" fill="#0A2A19"/>
      <rect x="418" y="520" width="148" height="210" rx="8" fill="${IVORY}" opacity="0.96"/>
      <text x="492" y="574" text-anchor="middle" font-family="Georgia, serif" font-size="19" letter-spacing="2.2" fill="${FOREST_DARK}">Herb &amp; Hue</text>
      <line x1="446" y1="590" x2="538" y2="590" stroke="${GOLD}" stroke-width="1.2"/>
      <text x="492" y="620" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="10" letter-spacing="3.6" fill="#5A6157">BOTANICAL</text>
      <text x="492" y="654" text-anchor="middle" font-family="Georgia, serif" font-size="26" fill="${FOREST_DARK}">Radiance</text>
      <text x="492" y="680" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="11" letter-spacing="2.4" fill="#5A6157">FACE SERUM</text>
      <text x="492" y="708" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="9" letter-spacing="2.6" fill="#7A8075">30 ML / 1 FL OZ</text>
      <rect x="392" y="452" width="30" height="360" rx="22" fill="#FFFDF4" opacity="0.3"/>
      <rect x="430" y="300" width="16" height="170" rx="10" fill="#FFFDF4" opacity="0.32"/>
    </g>
    <!-- botanical stems -->
    <g>
      <path d="M300 1010 C 260 880 240 780 250 650" stroke="#0B3D26" stroke-width="5" fill="none"/>
      <path d="M700 1010 C 745 870 770 760 756 640" stroke="#0B3D26" stroke-width="5" fill="none"/>
      <g fill="#DCE5D8" opacity="0.9">
        <path d="M250 660 C 190 640 160 590 172 530 C 236 542 268 590 250 660 Z"/>
        <path d="M268 740 C 330 720 372 676 376 614 C 306 618 264 664 268 740 Z" opacity="0.8"/>
        <path d="M700 700 C 760 676 792 626 786 566 C 722 578 692 632 700 700 Z"/>
        <path d="M740 800 C 682 786 640 744 628 686 C 696 686 742 730 740 800 Z" opacity="0.75"/>
      </g>
      <g fill="#04301D" opacity="0.9">
        <path d="M330 1150 C 280 1090 276 1020 300 970 C 360 1010 380 1080 330 1150 Z"/>
        <path d="M668 1160 C 716 1098 720 1028 696 978 C 638 1018 618 1090 668 1160 Z"/>
      </g>
    </g>
    <!-- foreground leaves, soft focus -->
    <g filter="url(#blur1)" opacity="0.9">
      <path d="M60 1250 C 40 1120 90 1010 190 960 C 220 1080 170 1190 60 1250 Z" fill="#0C4A2D" opacity="0.7"/>
      <path d="M960 1250 C 980 1120 930 1010 830 960 C 800 1080 850 1190 960 1250 Z" fill="#0C4A2D" opacity="0.6"/>
    </g>
    <circle cx="500" cy="470" r="330" fill="none" stroke="${GOLD}" stroke-width="1" opacity="0.35"/>
  </g>
</svg>`;
}

function philosophyArt() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 800" role="img">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FBF7ED"/><stop offset="1" stop-color="#DDE6D9"/></linearGradient>
    <linearGradient id="leaf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#125434"/><stop offset="1" stop-color="#052D1B"/></linearGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="10"/></filter>
    ${grain}
  </defs>
  <g filter="url(#grain)">
    <rect width="1000" height="800" fill="url(#bg)"/>
    <circle cx="640" cy="330" r="270" fill="#F8F4E9" opacity="0.75"/>
    <circle cx="640" cy="330" r="272" fill="none" stroke="${GOLD}" stroke-width="1.2" opacity="0.6"/>
    <ellipse cx="500" cy="660" rx="360" ry="48" fill="#173321" opacity="0.12" filter="url(#soft)"/>
    <g transform="translate(300 620)">
      <path d="M300 20 C 260 -140 300 -300 420 -400" stroke="#0A3A23" stroke-width="6" fill="none"/>
      <g fill="url(#leaf)">
        <path d="M330 -40 C 240 -70 190 -150 200 -230 C 290 -215 340 -140 330 -40 Z"/>
        <path d="M370 -170 C 470 -200 530 -270 528 -352 C 432 -340 380 -260 370 -170 Z" opacity="0.92"/>
        <path d="M395 -300 C 340 -360 330 -440 356 -500 C 424 -458 440 -380 395 -300 Z" opacity="0.85"/>
        <path d="M300 10 C 210 20 150 -20 120 -80 C 200 -104 274 -70 300 10 Z" opacity="0.9"/>
      </g>
      <g fill="none" stroke="${GOLD}" stroke-width="1.1" opacity="0.65">
        <path d="M200 -230 C 250 -170 300 -120 330 -40"/>
        <path d="M528 -352 C 470 -280 410 -220 370 -170"/>
      </g>
    </g>
    <g transform="translate(690 560) rotate(8)">
      <rect x="0" y="0" width="160" height="200" rx="10" fill="#F8F4E9" opacity="0.95"/>
      <rect x="0" y="0" width="160" height="200" rx="10" fill="none" stroke="${GOLD}" stroke-width="1" opacity="0.7"/>
      <text x="80" y="70" text-anchor="middle" font-family="Georgia, serif" font-size="22" fill="${FOREST}">Pure</text>
      <text x="80" y="98" text-anchor="middle" font-family="Georgia, serif" font-size="22" fill="${FOREST}">Botanical</text>
      <text x="80" y="126" text-anchor="middle" font-family="Georgia, serif" font-size="22" fill="${FOREST}">Care</text>
      <line x1="46" y1="146" x2="114" y2="146" stroke="${GOLD}"/>
    </g>
    <circle cx="250" cy="170" r="120" fill="#FFFDF6" opacity="0.5"/>
    <circle cx="250" cy="170" r="86" fill="none" stroke="${GOLD}" stroke-width="1" opacity="0.5"/>
  </g>
</svg>`;
}

function ritualArt() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 700" role="img">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#062F1D"/><stop offset="1" stop-color="#0B4529"/></linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8C6A24" stop-opacity="0.9"/><stop offset="0.5" stop-color="#E6CC93" stop-opacity="0.9"/><stop offset="1" stop-color="#7A5A18" stop-opacity="0.9"/></linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.4" r="0.6"><stop offset="0" stop-color="#D9B66F" stop-opacity="0.35"/><stop offset="1" stop-color="#D9B66F" stop-opacity="0"/></radialGradient>
    ${grain}
  </defs>
  <g filter="url(#grain)">
    <rect width="1200" height="700" fill="url(#bg)"/>
    <ellipse cx="600" cy="330" rx="520" ry="300" fill="url(#glow)"/>
    <g opacity="0.55" fill="none" stroke="${GOLD}" stroke-width="1">
      <circle cx="600" cy="340" r="240"/><circle cx="600" cy="340" r="300" stroke-opacity="0.5"/>
    </g>
    <g transform="translate(330 240)">
      <rect x="0" y="120" width="150" height="300" rx="18" fill="url(#glass)"/>
      <rect x="32" y="20" width="86" height="120" rx="12" fill="url(#glass)"/>
      <rect x="18" y="0" width="114" height="46" rx="10" fill="${GOLD}" opacity="0.85"/>
      <rect x="22" y="170" width="106" height="180" rx="4" fill="${IVORY}" opacity="0.95"/>
      <text x="75" y="210" text-anchor="middle" font-family="Georgia, serif" font-size="14" fill="${FOREST}">Herb &amp; Hue</text>
      <line x1="42" y1="222" x2="108" y2="222" stroke="${GOLD}"/>
      <text x="75" y="248" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="8" letter-spacing="2.4" fill="#5A6157">CLEANSE</text>
      <text x="75" y="278" text-anchor="middle" font-family="Georgia, serif" font-size="15" fill="${FOREST}">Botanical</text>
      <text x="75" y="298" text-anchor="middle" font-family="Georgia, serif" font-size="15" fill="${FOREST}">Gel</text>
    </g>
    <g transform="translate(700 220)">
      <rect x="0" y="80" width="190" height="340" rx="26" fill="url(#glass)"/>
      <rect x="60" y="20" width="70" height="80" rx="8" fill="${GOLD}" opacity="0.8"/>
      <rect x="20" y="150" width="150" height="190" rx="4" fill="${IVORY}" opacity="0.95"/>
      <text x="95" y="190" text-anchor="middle" font-family="Georgia, serif" font-size="15" fill="${FOREST}">Herb &amp; Hue</text>
      <line x1="46" y1="202" x2="144" y2="202" stroke="${GOLD}"/>
      <text x="95" y="228" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="8" letter-spacing="2.4" fill="#5A6157">MOISTURISE</text>
      <text x="95" y="262" text-anchor="middle" font-family="Georgia, serif" font-size="18" fill="${FOREST}">Velvet</text>
      <text x="95" y="284" text-anchor="middle" font-family="Georgia, serif" font-size="18" fill="${FOREST}">Cream</text>
    </g>
    <g fill="#9DBB9E" opacity="0.5">
      <path d="M180 660 C 150 540 180 450 260 400 C 300 500 270 600 180 660 Z"/>
      <path d="M1040 660 C 1070 540 1040 450 960 400 C 920 500 950 600 1040 660 Z"/>
    </g>
    <g fill="#DCE5D8" opacity="0.12">
      <path d="M240 700 C 300 600 380 560 460 560 C 400 640 330 690 240 700 Z"/>
    </g>
  </g>
</svg>`;
}

function categoryArt(name, subtitle, tone, accent) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" role="img">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="${tone}"/><stop offset="1" stop-color="${accent}"/></linearGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="14"/></filter>
    ${grain}
  </defs>
  <g filter="url(#grain)">
    <rect width="800" height="1000" fill="url(#bg)"/>
    <circle cx="400" cy="420" r="250" fill="#F8F4E9" opacity="0.16"/>
    <circle cx="400" cy="420" r="252" fill="none" stroke="${GOLD}" stroke-width="1.2" opacity="0.55"/>
    <g opacity="0.55">
      <path d="M600 640 C 660 560 700 500 760 470" stroke="${FOREST}" stroke-width="2.4" fill="none"/>
      ${leaf(690, 500, 1.35, -22, FOREST, 0.75)}
      ${leaf(618, 588, 1.05, 158, FOREST, 0.65)}
      <path d="M205 700 C 160 620 150 560 130 505" stroke="${FOREST}" stroke-width="2.2" fill="none"/>
      ${leaf(160, 545, 1.15, 12, FOREST, 0.6)}
    </g>
    <ellipse cx="400" cy="742" rx="215" ry="32" fill="#10251A" opacity="0.2" filter="url(#soft)"/>
    <g transform="translate(400 552)">
      <rect x="-116" y="-96" width="232" height="52" rx="14" fill="#06301D"/>
      <rect x="-116" y="-96" width="232" height="9" rx="4.5" fill="#FFFFFF" opacity="0.14"/>
      <rect x="-108" y="-46" width="216" height="262" rx="30" fill="#F1E9D7" opacity="0.94"/>
      <rect x="-108" y="-46" width="32" height="262" rx="16" fill="#FFFFFF" opacity="0.4"/>
      <rect x="-64" y="-6" width="128" height="150" rx="6" fill="#F8F4E9"/>
      <text x="0" y="26" text-anchor="middle" font-family="Georgia, serif" font-size="17" letter-spacing="0.5" fill="${FOREST}">Herb &amp; Hue</text>
      <line x1="-40" y1="40" x2="40" y2="40" stroke="${GOLD}"/>
      <text x="0" y="68" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="9" letter-spacing="3" fill="#5A6157">${name.toUpperCase()}</text>
      <text x="0" y="100" text-anchor="middle" font-family="Georgia, serif" font-size="15" letter-spacing="1" fill="${FOREST}">Botanical</text>
      <text x="0" y="124" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="8" letter-spacing="2" fill="${GOLD}">BODY &amp; BATH</text>
      <circle cx="0" cy="-70" r="18" fill="none" stroke="${GOLD}" stroke-width="1.1" opacity="0.9"/>
      <text x="0" y="-64" text-anchor="middle" font-family="Georgia, serif" font-size="15" fill="${GOLD}">H</text>
    </g>
      <text x="400" y="930" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="13" letter-spacing="5" fill="${IVORY}" opacity="0.85">${subtitle.toUpperCase()}</text>
  </g>
</svg>`;
}

function galleryTile(i, tone) {
  const motifs = [
    `<circle cx="400" cy="400" r="210" fill="none" stroke="${GOLD}" stroke-width="1.2" opacity="0.7"/>
     <path d="M400 620 C 380 480 420 380 540 300" stroke="#0B3D26" stroke-width="4" fill="none" opacity="0.7"/>
     <g fill="#0B3D26" opacity="0.85"><path d="M430 400 C 340 380 300 310 310 240 C 400 250 450 320 430 400 Z"/><path d="M470 330 C 560 300 600 230 590 160 C 500 190 460 250 470 330 Z"/></g>`,
    `<ellipse cx="400" cy="560" rx="200" ry="60" fill="#FFFDF6" opacity="0.5"/>
     <g fill="#D9B66F" opacity="0.9"><circle cx="330" cy="420" r="34"/><circle cx="420" cy="370" r="26"/><circle cx="480" cy="450" r="30"/><circle cx="370" cy="510" r="24"/></g>
     <path d="M250 600 C 300 500 380 470 470 480" stroke="#0B3D26" stroke-width="3" fill="none" opacity="0.6"/>`,
    `<g opacity="0.9"><rect x="290" y="300" width="220" height="300" rx="18" fill="#F8F4E9" opacity="0.9"/><rect x="330" y="240" width="140" height="80" rx="8" fill="${GOLD}" opacity="0.9"/><text x="400" y="430" text-anchor="middle" font-family="Georgia, serif" font-size="22" fill="${FOREST}">Hue</text><line x1="340" y1="450" x2="460" y2="450" stroke="${GOLD}"/></g>
     <circle cx="400" cy="450" r="250" fill="none" stroke="${GOLD}" stroke-width="1" opacity="0.4"/>`,
    `<g fill="#0B3D26" opacity="0.75"><path d="M250 650 C 220 510 280 400 400 350 C 440 480 380 590 250 650 Z"/><path d="M560 660 C 590 520 530 410 410 360 C 370 490 430 600 560 660 Z" opacity="0.6"/></g>
     <circle cx="405" cy="300" r="60" fill="#D9B66F" opacity="0.8"/>`,
    `<g opacity="0.85"><path d="M280 560 L280 380 C280 300 520 300 520 380 L520 560 Z" fill="#F8F4E9" opacity="0.85"/><path d="M300 380 C 340 330 460 330 500 380" stroke="#0B3D26" stroke-width="4" fill="none"/></g>
     <line x1="200" y1="600" x2="600" y2="600" stroke="${GOLD}" opacity="0.8"/>`,
    `<g opacity="0.9"><circle cx="400" cy="430" r="160" fill="#FFFDF6" opacity="0.5"/><circle cx="400" cy="430" r="160" fill="none" stroke="#0B3D26" opacity="0.4"/><path d="M400 270 C 360 340 360 520 400 590 C 440 520 440 340 400 270 Z" fill="#0B3D26" opacity="0.5"/><path d="M270 430 C 340 390 460 390 530 430 C 460 470 340 470 270 430 Z" fill="#D9B66F" opacity="0.6"/></g>`,
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" role="img">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="0.5" y2="1"><stop offset="0" stop-color="${tone}"/><stop offset="1" stop-color="#E3E9DE"/></linearGradient>${grain}</defs>
  <g filter="url(#grain)"><rect width="800" height="800" fill="url(#bg)"/>${motifs[(i - 1) % motifs.length]}</g>
</svg>`;
}

async function writeArt() {
  await mkdir(path.join(imagesDir, 'products'), { recursive: true });
  await mkdir(path.join(imagesDir, 'categories'), { recursive: true });
  await mkdir(path.join(imagesDir, 'gallery'), { recursive: true });
  await mkdir(path.join(imagesDir, 'editorial'), { recursive: true });

  const files = [
    ['editorial/hero-botanical.svg', editorialHero()],
    ['editorial/philosophy.svg', philosophyArt()],
    ['editorial/ritual.svg', ritualArt()],
    ['products/radiance-serum.svg', bottle({ glass: '#C9A227', text: 'HERB &amp; HUE' })],
    ['products/radiance-serum-alt.svg', bottle({ glass: '#B98F3E', label: '#F3EDDD', text: 'HERB &amp; HUE' })],
    ['products/velvet-cream.svg', jar()],
    ['products/botanical-cleanser.svg', bottle({ glass: '#7FA083', label: IVORY, text: 'HERB &amp; HUE' })],
    ['products/overnight-balm.svg', jar()],
    ['products/rose-mist.svg', bottle({ glass: '#C08B7A', label: IVORY, text: 'HERB &amp; HUE' })],
    ['products/clay-mask.svg', jar()],
    ['categories/cleansers.svg', categoryArt('Cleansers', 'Purify gently', '#E8EFE4', '#CBD9C6')],
    ['categories/serums.svg', categoryArt('Serums', 'Concentrated care', '#F3EEDF', '#DFD3B8')],
    ['categories/moisturisers.svg', categoryArt('Moisturisers', 'Soft hydration', '#E4EBDF', '#C6D6C4')],
    ['categories/body.svg', categoryArt('Body', 'Rituals head to toe', '#EFE7D6', '#D9C9A8')],
    ...Array.from({ length: 6 }, (_, i) => [
      `gallery/gallery-${i + 1}.svg`,
      galleryTile(i + 1, ['#F3EDDF', '#E7EEE3', '#F6F1E5', '#E2EADF', '#F2EADC', '#E9F0E6'][i]),
    ]),
  ];

  for (const [rel, svg] of files) {
    await writeFile(path.join(imagesDir, rel), svg);
  }

  const og = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
    <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#052D1B"/><stop offset="1" stop-color="#073B24"/></linearGradient>${grain}</defs>
    <rect width="1200" height="630" fill="url(#bg)"/>
    <circle cx="1050" cy="120" r="320" fill="none" stroke="${GOLD}" stroke-width="1.2" opacity="0.45"/>
    <circle cx="980" cy="330" r="150" fill="${GOLD}" opacity="0.08"/>
    <g fill="${GOLD}" opacity="0.8">
      <path d="M880 500 C 900 380 980 320 1080 300 C 1060 410 980 480 880 500 Z"/>
      <path d="M920 520 C 940 440 990 400 1060 390 C 1044 464 990 508 920 520 Z" opacity="0.65"/>
    </g>
    <text x="100" y="270" font-family="Georgia, serif" font-size="94" fill="#F3E7C9" letter-spacing="1">Herb &amp; Hue</text>
    <text x="104" y="330" font-family="Helvetica, Arial, sans-serif" font-size="20" letter-spacing="12" fill="${GOLD}">NATURAL SKINCARE</text>
    <line x1="104" y1="380" x2="520" y2="380" stroke="${GOLD}" opacity="0.5"/>
    <text x="104" y="440" font-family="Georgia, serif" font-size="30" fill="#DCE5D8" opacity="0.9">Botanical rituals, quietly considered.</text>
  </svg>`;
  await writeFile(path.join(imagesDir, 'og-herb-and-hue.svg'), og);

  return files.length + 1;
}

await deriveBrandAssets();
const count = await writeArt();
console.log(`Generated ${count} SVG illustrations.`);
