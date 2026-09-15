/**
 * Every local href and src on the press pages must resolve to a file that
 * exists. A press kit whose download link 404s is worse than one that never
 * promised the file.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SITE = process.argv[2];
let bad = 0, checked = 0;

for (const page of ['press.html', 'press-en.html']) {
  const html = readFileSync(join(SITE, page), 'utf8');
  const refs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
  for (const ref of refs) {
    if (/^(https?:|mailto:|#)/.test(ref)) continue;
    const path = join(SITE, ref.split('?')[0]);
    checked++;
    if (!existsSync(path)) {
      console.log(`MISSING  ${page}  ->  ${ref}`);
      bad++;
    }
  }
  // The sizes printed under each thumbnail are a claim about the file.
  for (const m of html.matchAll(/href="(assets\/press\/screens\/[^"]+\.png)" download/g)) {
    const b = readFileSync(join(SITE, m[1]));
    const dims = `${b.readUInt32BE(16)}×${b.readUInt32BE(20)}`;
    const idx = html.indexOf(m[0]);
    const caption = html.slice(Math.max(0, idx - 260), idx);
    if (!caption.includes(dims)) {
      console.log(`WRONG SIZE  ${page}  ${m[1]}  is really ${dims}`);
      bad++;
    }
  }
}
console.log(bad === 0 ? `OK — ${checked} local references all resolve` : `${bad} problem(s)`);
process.exit(bad === 0 ? 0 : 1);
