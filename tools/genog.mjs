/**
 * Render the homepage's share cards: assets/home/og/<code>.jpg, 1200x630,
 * one per language. A card is the hero itself (the headline and the 3D
 * phone on the garage screen) with everything else hidden, so it always
 * matches the page.
 *
 *   python3 -m http.server 8765 --bind 127.0.0.1     (from the repo root)
 *   node tools/genog.mjs                              (every language)
 *   node tools/genog.mjs http://127.0.0.1:8765 de,uk  (some)
 *   node tools/genhome.mjs .                          (stamps the new hashes)
 *
 * Needs Playwright with Chromium (npm i -g playwright). Rendering uses
 * SwiftShader, so no GPU is needed; each card takes a few seconds.
 *
 * Japanese, Korean and Chinese headlines are set in Noto Sans 800, fetched
 * from Google Fonts for just the headline's characters: the page itself uses
 * the visitor's system fonts, but a card is an image, and it should not
 * depend on which fonts the machine that renders it happens to have.
 */
import { readdirSync, mkdirSync } from 'node:fs';

const { chromium } = await import('playwright').catch(() => import('/opt/node22/lib/node_modules/playwright/index.mjs'));
const base = process.argv[2] ?? 'http://127.0.0.1:8765';
const codes = (process.argv[3] ?? readdirSync('tools/home/i18n').filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).join(',')).split(',');

const CJK = { ja: 'Noto Sans JP', ko: 'Noto Sans KR', zh: 'Noto Sans SC' };

mkdirSync('assets/home/og', { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const code of codes) {
  // reduced motion: the phone stands still on the garage, no autoplay
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  // the cards are the night garage, whatever the machine prefers
  await page.addInitScript(() => { try { localStorage.setItem('maintra.lang', 'stay'); localStorage.setItem('maintra.theme', 'dark'); } catch (e) {} });
  await page.goto(`${base}${code === 'en' ? '/' : `/${code}/`}`);
  await page.addStyleTag({ content: `
    html { scroll-behavior: auto !important; }
    .skip, .top-nav, .lang, .theme-btn, .top-get, .lede, .stores, .note, .cue, .hero-spec, .facts, .ticker, .loader { display: none !important; }
    .top { background: none !important; border: 0 !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
    .hero { min-height: 630px !important; height: 630px !important; padding: 0 !important; }
    .hero-in { height: 630px !important; min-height: 0 !important; padding: 64px 56px 0 64px !important; grid-template-columns: minmax(0, 1.08fr) minmax(0, .92fr) !important; align-items: center !important; }
    .hero-copy { gap: 26px !important; padding: 0 !important; align-self: center !important; }
    .hero-copy .h1 { font-size: ${code === 'ar' ? 74 : 92}px !important; }
    .hero-phone { height: 630px !important; min-height: 0 !important; margin-top: -64px !important; padding: 0 !important; }
    .hero-phone .slot { flex: none !important; height: 560px !important; margin-top: 40px !important; }
  ` });
  await page.waitForFunction(() => !document.documentElement.classList.contains('loading'), null, { timeout: 20000 }).catch(() => {});
  if (CJK[code]) {
    const text = await page.evaluate(() => document.querySelector('.hero-copy .h1').textContent);
    await page.addStyleTag({ url: `https://fonts.googleapis.com/css2?family=${CJK[code].replace(/ /g, '+')}:wght@800&text=${encodeURIComponent(text)}` });
    await page.addStyleTag({ content: `.hero-copy .h1 { font-family: Tektur, '${CJK[code]}', sans-serif !important; }` });
  }
  await page.evaluate(() => document.fonts.ready);
  // the longest headlines step down until they fit the card
  const size = await page.evaluate((start) => {
    const h = document.querySelector('.hero-copy .h1');
    const copy = document.querySelector('.hero-copy');
    let px = start;
    const fits = () => {
      const range = document.createRange();
      range.selectNodeContents(h);
      return range.getBoundingClientRect().width <= copy.clientWidth + 1 && h.getBoundingClientRect().height <= 390;
    };
    while (!fits() && px > 48) { px -= 2; h.style.setProperty('font-size', `${px}px`, 'important'); }
    return px;
  }, code === 'ar' ? 74 : 92);
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  await page.waitForTimeout(6000);
  await page.screenshot({ path: `assets/home/og/${code}.jpg`, type: 'jpeg', quality: 84, scale: 'css' });
  console.log(`assets/home/og/${code}.jpg  headline ${size}px`);
  await page.close();
}
await browser.close();
