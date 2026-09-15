/**
 * Build the "everything in one download" archives.
 *
 *   node tools/press-zip.mjs .
 *
 * One zip per language rather than one for the lot, because **Cloudflare Pages
 * refuses any single asset over 25 MiB** and the full set is ~45 MB. That is a
 * hard platform limit, not a preference: a zip over it does not warn, it just
 * is not there. So this script ASSERTS the limit and fails loudly here rather
 * than letting a silent 404 reach a journalist.
 *
 * Screenshots are PNGs and PNG is already deflate-compressed, so a zip of them
 * saves a percent or two at best. Treat the raw total as the packed size when
 * judging whether something new still fits — there is roughly 2 MB of headroom
 * per language, which is about one more screenshot.
 *
 * Pages serves this repo directly with no build step, so the output is
 * committed. Rerun after adding or replacing any press asset.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync, statSync, readdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const SITE = process.argv[2] || '.';
const PRESS = join(SITE, 'assets/press');
const LIMIT = 25 * 1024 * 1024; // Cloudflare Pages, per asset

const BRAND = [
  'maintra-icon-1024.png',
  'maintra-icon-1024-transparent.png',
  'maintra-logo.png',
  'maintra-feature-1024x500.png',
];

const README = {
  uk: `MAINTRA — ПРЕСКІТ
Оновлено: 15 вересня 2026
maintra.me/press

Що в архіві
  logo/         іконка (прозора й на фоні), логотип, feature graphic
  screenshots/  чисті скріншоти застосунку (-clean) і сторові зі слоганами
                (-store). Для статті беріть чисті.
  photo/        фото розробника
  texts.txt     готові тексти: одне речення, 50 слів, 150 слів, цитати,
                boilerplate

Дозвіл
  Усі матеріали дозволено використовувати в редакційних матеріалах без
  окремого погодження. Назва пишеться Maintra — з великої M, без пробілів.

Контакт
  rokops13@gmail.com — відповідаю на всі листи. Якщо потрібен матеріал,
  якого тут немає, або цифра з актуальною датою — так само.
`,
  en: `MAINTRA — PRESS KIT
Updated: 15 September 2026
maintra.me/press-en

What is in here
  logo/         icon (transparent and on a background), logo, feature graphic
  screenshots/  clean screenshots of the app (-clean) and the store versions
                with slogans (-store). Use the clean ones in an article.
  photo/        photo of the developer
  texts-en.txt  ready-to-use copy: one sentence, 50 words, 150 words, quotes,
                boilerplate

Permission
  Everything here may be used in editorial coverage without asking first.
  The name is written Maintra — capital M, one word.

Contact
  rokops13@gmail.com — I answer every email. Same if you need material that
  is not here, or a figure with a current date on it.
`,
};

/**
 * Zip a staged directory with FORWARD-SLASH entry names.
 *
 * `Compress-Archive` on Windows PowerShell 5.1 writes `dir\file.png` into the
 * central directory. The ZIP spec says separators are forward slashes, and the
 * practical consequence is that macOS — which is what most picture desks run —
 * unpacks the whole archive as a flat pile of files with literal backslashes
 * in their names. So entries are added one at a time with the name set
 * explicitly, rather than letting the platform choose.
 */
function zip(stageDir, outFile) {
  const files = [];
  (function walk(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else files.push(p);
    }
  })(stageDir);

  const ps = files
    .map((f) => {
      const entry = f.slice(stageDir.length + 1).split('\\').join('/');
      return `  $e = $z.CreateEntry('${entry}', $lvl)
  $s = $e.Open(); $b = [IO.File]::ReadAllBytes('${f}'); $s.Write($b, 0, $b.Length); $s.Dispose()`;
    })
    .join('\n');

  const script = `$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$lvl = [IO.Compression.CompressionLevel]::Optimal
$fs = [IO.File]::Open('${outFile}', 'Create')
$z = New-Object IO.Compression.ZipArchive($fs, [IO.Compression.ZipArchiveMode]::Create)
${ps}
$z.Dispose(); $fs.Dispose()
`;
  const scriptFile = join(stageDir, '..', `zip-${Date.now()}.ps1`);
  writeFileSync(scriptFile, script, 'utf8');
  try {
    execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptFile], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } finally {
    rmSync(scriptFile, { force: true });
  }
}

/**
 * Read the archive's own central directory and fail on any backslash. The bug
 * above is invisible on Windows — every local tool opens such a zip correctly
 * — so the only honest check is the bytes.
 */
function assertForwardSlashes(file) {
  const b = readFileSync(file);
  const SIG = 0x02014b50; // central directory file header
  let found = 0;
  for (let i = 0; i < b.length - 46; i++) {
    if (b.readUInt32LE(i) !== SIG) continue;
    const nameLen = b.readUInt16LE(i + 28);
    const name = b.toString('utf8', i + 46, i + 46 + nameLen);
    found++;
    if (name.includes('\\')) throw new Error(`${file}: entry uses a backslash: ${name}`);
  }
  if (!found) throw new Error(`${file}: no central directory entries found`);
  return found;
}

const results = [];

for (const lang of ['uk', 'en']) {
  const name = `maintra-press-kit-${lang}`;
  const stage = join(PRESS, `.stage-${lang}`);
  rmSync(stage, { recursive: true, force: true });

  const root = join(stage, name);
  for (const d of ['logo', 'screenshots', 'photo']) mkdirSync(join(root, d), { recursive: true });

  writeFileSync(join(root, 'README.txt'), README[lang], 'utf8');
  const texts = lang === 'uk' ? 'texts.txt' : 'texts-en.txt';
  copyFileSync(join(PRESS, texts), join(root, texts));

  for (const f of BRAND) copyFileSync(join(PRESS, f), join(root, 'logo', f));

  const shots = join(PRESS, 'screens', lang);
  for (const f of readdirSync(shots).filter((f) => f.endsWith('.png'))) {
    copyFileSync(join(shots, f), join(root, 'screenshots', f));
  }

  const photos = join(PRESS, 'photo');
  for (const f of readdirSync(photos).filter((f) => /^maintra-developer-/.test(f))) {
    copyFileSync(join(photos, f), join(root, 'photo', f));
  }

  const out = join(PRESS, `${name}.zip`);
  rmSync(out, { force: true });
  zip(stage, out);
  rmSync(stage, { recursive: true, force: true });
  assertForwardSlashes(out);

  const size = statSync(out).size;
  results.push({ name: `${name}.zip`, size });
  const pct = ((size / LIMIT) * 100).toFixed(0);
  console.log(`${name}.zip  ${(size / 1024 / 1024).toFixed(1)} MB  (${pct}% of the 25 MiB Pages limit)`);
}

const over = results.filter((r) => r.size > LIMIT);
if (over.length) {
  console.error('\nOVER THE CLOUDFLARE PAGES LIMIT — these would deploy as 404s:');
  for (const r of over) console.error(`  ${r.name}  ${(r.size / 1024 / 1024).toFixed(1)} MB > 25 MiB`);
  console.error('Split the archive further, or leave the store screenshots out of it.');
  process.exit(1);
}
console.log('\nboth archives are within the limit');
