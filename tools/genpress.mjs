/**
 * Generate the two press pages from one template.
 *
 * press.html (uk) and press-en.html are the same page in two languages. Kept
 * as two hand-written files they would drift the moment either is edited —
 * the same argument assets/nav.js makes for building the menu button in one
 * place rather than pasting it into ten static pages. So: one structure, one
 * screenshot manifest, two dictionaries of copy.
 *
 * Output is plain static HTML with no runtime dependency, because a press kit
 * has to survive a journalist with JavaScript switched off.
 *
 * Regenerate both pages after editing anything below, then check the result:
 *
 *   node tools/genpress.mjs .
 *   node tools/press-linkcheck.mjs .
 *
 * Do not hand-edit press.html or press-en.html — they are output, and an edit
 * there is lost on the next run.
 */
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SITE = process.argv[2];
const SHOTS = 'assets/press/screens';

/** PNG dimensions straight from the IHDR chunk — stated sizes have to be true. */
function pngSize(file) {
  const b = readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
const kb = (file) => Math.round(statSync(file).size / 1024);

/**
 * The screenshots, in the order a reader meets the app.
 *
 * `clean` are straight off the phone — no frame, no marketing text. `store`
 * are the listing images, slogan and all. An article wants the clean ones;
 * the store ones are here because a shop-window shot is sometimes exactly
 * what a roundup piece needs.
 */
const CLEAN = [
  ['garage', 'Гараж', 'Garage'],
  ['services', 'Історія обслуговування', 'Service history'],
  ['ai-entry', 'Розпізнавання чека', 'Reading a receipt'],
  ['plan', 'План обслуговування', 'Maintenance plan'],
  ['fuel', 'Пальне і заправки', 'Fuel and stations'],
  ['documents', 'Зашифровані документи', 'Encrypted documents'],
  ['tyres-sets', 'Комплекти шин', 'Tyre sets'],
  ['tyres-corners', 'Шини на авто', 'Tyres on the car'],
  ['tyre', 'Одна шина — з датою виробництва', 'One tyre, with its build date'],
  ['shelf', 'Куплене, ще не встановлене', 'Bought, not fitted yet'],
  ['wishlist', 'Хотілки', 'Wishlist'],
  ['stats', 'Статистика', 'Statistics'],
  ['chat', 'Чат з AI', 'AI chat'],
];
const STORE = [
  ['garage', 'Гараж', 'Garage'],
  ['logging', 'Внесення записів', 'Logging'],
  ['plan', 'План', 'Plan'],
  ['chat', 'Чат з AI', 'AI chat'],
  ['tyres', 'Шини', 'Tyres'],
  ['documents', 'Документи', 'Documents'],
  ['wishlist', 'Хотілки', 'Wishlist'],
  ['stats', 'Статистика', 'Statistics'],
];

function gallery(lang, rows, kind) {
  return rows
    .map(([key, uk, en]) => {
      const name = lang === 'uk' ? uk : en;
      const file = `${SHOTS}/${lang}/maintra-${key}-${kind}.png`;
      const thumb = `${SHOTS}/${lang}/thumbs/${key}-${kind}.jpg`;
      const { w, h } = pngSize(join(SITE, file));
      const th = Math.round(420 * (h / w));
      const dl = lang === 'uk' ? 'Завантажити' : 'Download';
      return `      <figure class="shot">
        <a href="${file}" target="_blank" rel="noopener"><img src="${thumb}" alt="${name}" loading="lazy" width="420" height="${th}" /></a>
        <figcaption>
          <span class="name">${name}</span>
          <span class="meta">PNG · ${w}×${h} · ${kb(join(SITE, file))} KB</span>
          <a href="${file}" download>${dl}</a>
        </figcaption>
      </figure>`;
    })
    .join('\n');
}

const T = {
  uk: {
    other: 'press-en.html',
    otherLabel: 'English',
    title: 'Прескіт — Maintra',
    desc: 'Матеріали для преси: логотипи, скріншоти, готові тексти й фактаж про Maintra — цифрову сервісну книжку для авто й мотоциклів. Використання дозволено без погодження.',
    ogDesc: 'Логотипи, скріншоти, готові тексти й фактаж. Використання в редакційних матеріалах дозволено без окремого погодження.',
    nav: [['about.html', 'Про розробника'], ['faq.html', 'FAQ'], ['support.html', 'Support']],
    h1: 'Прескіт',
    lede: 'Усе, що потрібно для матеріалу про Maintra: логотипи, скріншоти, готові тексти й перевірений фактаж. Нічого погоджувати не треба — умови нижче.',
    permission:
      '<strong>Дозвіл.</strong> Усі матеріали в цьому прескіті дозволено використовувати в редакційних матеріалах без окремого погодження. Назва пишеться <strong>Maintra</strong> — з великої M, без пробілів.',
    factsH: 'Фактаж',
    factsNote: 'Якщо якоїсь цифри тут немає — напишіть, і я дам її з датою. Краще так, ніж припущення.',
    facts: [
      ['Що це', 'Цифрова сервісна книжка для авто й мотоциклів'],
      ['Платформи', 'iOS та Android'],
      ['Поточна версія', '1.6.0, вийшла 14 вересня 2026 (Google Play vc29 · App Store build 55)'],
      ['Мови інтерфейсу', 'українська, англійська, польська, французька, італійська, іспанська'],
      ['Типи техніки', 'авто й мотоцикли'],
      [
        'Тарифи',
        'Безкоштовно — одне авто, вся історія, заправки, план, нагадування, шини, один документ на авто.<br />Pro та VIP — більше авто й AI-функції (розпізнавання чеків, план, аналіз фото шин, чат).',
      ],
      ['Офлайн', 'Так. Дані зберігаються на пристрої; синхронізація — коли зʼявиться звʼязок'],
      ['Реклама й трекінг', 'Немає'],
      ['Стек', 'React Native (Expo), Supabase, Claude для AI-функцій'],
      ['Розробник', 'ROK (Кирило Розбейко), один автор'],
      ['Контакт', '<a href="mailto:rokops13@gmail.com">rokops13@gmail.com</a>'],
      ['Сайт', '<a href="https://maintra.me">maintra.me</a>'],
      [
        'App Store',
        '<a href="https://apps.apple.com/app/maintra/id6775876731" rel="noopener">apps.apple.com/app/maintra/id6775876731</a>',
      ],
      [
        'Google Play',
        '<a href="https://play.google.com/store/apps/details?id=com.maintra.app" rel="noopener">play.google.com/store/apps/details?id=com.maintra.app</a>',
      ],
    ],
    textsH: 'Тексти',
    textsLede: 'Копіюйте як є. Усе те саме одним файлом: <a href="assets/press/texts.txt">texts.txt</a>.',
    oneH: 'Одне речення',
    one: ['Maintra — це цифрова сервісна книжка для авто й мототехніки: фото чека зі СТО автоматично стає записом з деталями, роботою й сумою.'],
    fiftyH: '50 слів',
    fifty: ['Maintra — це цифрова сервісна книжка для авто й мотоциклів. Застосунок розпізнає чек зі СТО чи заправки будь-якою мовою і перетворює його на повний запис, будує план обслуговування за пробігом, зберігає документи в зашифрованому сейфі та веде облік шин за датою виробництва. Працює офлайн, без реклами й без трекінгу.'],
    longH: '150 слів',
    long: [
      'Maintra — це цифрова сервісна книжка для авто й мотоциклів. Застосунок розпізнає чек зі СТО чи заправки будь-якою мовою і перетворює його на повний запис: деталі, роботи, суми, пробіг. Далі він будує план обслуговування, рахує реальну витрату пального, зберігає документи в зашифрованому сейфі й веде облік шин — включно з датою виробництва, бо гума дубіє за віком, а не за пробігом.',
      'Застосунок виріс із власної потреби розробника: він тримає на ходу старий Mitsubishi Pajero, і йому набридла коробка з чеками в бардачку. Maintra працює офлайн, не показує реклами і не має трекінгу; історію обслуговування можна будь-коли вивантажити й забрати з собою.',
      'Безкоштовно: одне авто, вся історія обслуговування, заправки, план, нагадування, шини й документи. Платно — лише те, за що розробник сам платить третім сторонам: розпізнавання чеків, AI-план обслуговування та аналіз фото шин.',
    ],
    quotesH: 'Цитати розробника',
    quotesNote: 'Беріть будь-яку, питати не треба.',
    quotes: [
      '«Великі ремонти памʼятаєш і без застосунку. Губиться дрібне: який саме фільтр, скільки залили, коли востаннє. Через три роки це вже не історія авто, а купа чеків у бардачку.»',
      '«Протектор перед зимою перевіряють усі, дату виробництва майже ніхто. А після шести років гума дубіє незалежно від того, скільки на ній міліметрів.»',
      '«Техпаспорт і страховка — це ПІБ, адреса, VIN і підпис в одному файлі. Тому документи шифруються на телефоні до того, як кудись поїдуть: ключ є тільки у власника, і кнопки "відновити доступ" не існує. Це незручно — і це навмисно.»',
      '«Я не хотів робити ще одну підписку. Усе, що нічого не коштує в обслуговуванні, лишається безкоштовним. Платне — тільки те, за що я сам плачу третім сторонам.»',
    ],
    boilerH: 'Boilerplate — у кінець статті',
    boiler: ['Maintra — цифрова сервісна книжка для авто й мотоциклів: розпізнає чеки зі СТО, веде план обслуговування, шини й зашифровані документи. Працює офлайн, без реклами. Розробник: ROK (Кирило Розбейко), один автор. Завантажити: App Store та Google Play, безкоштовно. maintra.me'],
    logoH: 'Логотип та іконка',
    logos: [
      ['maintra-icon-1024.png', 'Іконка, непрозорий фон', 'PNG · 1024×1024', 'Іконка Maintra на непрозорому фоні'],
      ['maintra-icon-1024-transparent.png', 'Іконка, прозорий фон', 'PNG · 1024×1024 · alpha', 'Іконка Maintra з прозорим фоном'],
      ['maintra-logo.png', 'Логотип', 'PNG · alpha', 'Логотип Maintra'],
      ['maintra-feature-1024x500.png', 'Feature graphic', 'PNG · 1024×500', 'Feature graphic Maintra'],
    ],
    dl: 'Завантажити',
    shotsH: 'Скріншоти',
    shotsLede:
      'Скріншоти українською. Англійські — на <a href="press-en.html">English version</a> цієї сторінки. Клік відкриває повний розмір.',
    cleanH: 'Чисті скріншоти',
    cleanNote: 'Просто екран застосунку: без рамки телефона й без маркетингового тексту. Для статті беріть ці — слоган поверх картинки виглядає як реклама.',
    storeH: 'Сторові скріншоти',
    storeNote: 'Ті самі екрани, як вони виглядають у App Store та Google Play — у рамці й зі слоганом.',
    videoH: 'Відео',
    videoNote: 'Готується: запис екрана на 20–40 секунд без музики й голосу — один сценарій, фото чека перетворюється на запис. MP4 файлом, окремо GIF на 5 секунд для телеграм-каналів.',
    photoH: 'Фото розробника',
    photoNote: 'Готується: горизонтальне й вертикальне фото, від 2000 px по довгій стороні.',
    zipH: 'Забрати все одразу',
    zipNote: 'Архів зʼявиться тут, коли всі матеріали будуть на місці.',
    qH: 'Питання',
    q: 'Пишіть на <a href="mailto:rokops13@gmail.com">rokops13@gmail.com</a> — відповідаю на всі листи. Якщо потрібен матеріал, якого тут немає, або цифра з актуальною датою — так само.',
    footer: '<a href="index.html">Home</a> · <a href="about.html">About</a> · <a href="faq.html">FAQ</a> · <a href="privacy.html">Privacy</a>',
  },

  en: {
    other: 'press.html',
    otherLabel: 'Українська',
    title: 'Press kit — Maintra',
    desc: 'Press materials for Maintra, a digital service book for cars and motorcycles: logos, screenshots, ready-to-use copy and a fact sheet. Free to use in editorial coverage.',
    ogDesc: 'Logos, screenshots, ready-to-use copy and a fact sheet. Free to use in editorial coverage, no permission needed.',
    nav: [['about.html', 'About'], ['faq.html', 'FAQ'], ['support.html', 'Support']],
    h1: 'Press kit',
    lede: 'Everything you need to write about Maintra: logos, screenshots, ready-to-use copy and a checked fact sheet. Nothing here needs clearing with me — terms below.',
    permission:
      '<strong>Permission.</strong> Everything in this press kit may be used in editorial coverage without asking first. The name is written <strong>Maintra</strong> — capital M, one word.',
    factsH: 'Fact sheet',
    factsNote: 'If a number you need is missing, write to me and I will give it to you with the date it was true. Better that than a guess.',
    facts: [
      ['What it is', 'A digital service book for cars and motorcycles'],
      ['Platforms', 'iOS and Android'],
      ['Current version', '1.6.0, released 14 September 2026 (Google Play vc29 · App Store build 55)'],
      ['Interface languages', 'Ukrainian, English, Polish, French, Italian, Spanish'],
      ['Vehicle types', 'Cars and motorcycles'],
      [
        'Pricing',
        'Free — one vehicle, the full history, fuel logs, plan, reminders, tyres, one document per vehicle.<br />Pro and VIP — more vehicles and the AI features (receipt reading, maintenance plan, tyre photo analysis, chat).',
      ],
      ['Offline', 'Yes. Data lives on the device; it syncs when there is a connection'],
      ['Ads and tracking', 'None'],
      ['Stack', 'React Native (Expo), Supabase, Claude for the AI features'],
      ['Developer', 'ROK (Kyrylo Rozbeiko), a single developer'],
      ['Contact', '<a href="mailto:rokops13@gmail.com">rokops13@gmail.com</a>'],
      ['Website', '<a href="https://maintra.me">maintra.me</a>'],
      [
        'App Store',
        '<a href="https://apps.apple.com/app/maintra/id6775876731" rel="noopener">apps.apple.com/app/maintra/id6775876731</a>',
      ],
      [
        'Google Play',
        '<a href="https://play.google.com/store/apps/details?id=com.maintra.app" rel="noopener">play.google.com/store/apps/details?id=com.maintra.app</a>',
      ],
    ],
    textsH: 'Copy',
    textsLede: 'Use it as it stands. The same text as one file: <a href="assets/press/texts-en.txt">texts-en.txt</a>.',
    oneH: 'One sentence',
    one: ['Maintra is a digital service book for cars and motorcycles: photograph a garage receipt and it becomes a full record — parts, labour and cost.'],
    fiftyH: '50 words',
    fifty: ['Maintra is a digital service book for cars and motorcycles. It reads a garage or fuel receipt in any language and turns it into a complete record, builds a maintenance plan from your mileage, keeps documents in an encrypted vault, and tracks tyres by their manufacturing date. Works offline, no ads, no tracking.'],
    longH: '150 words',
    long: [
      'Maintra is a digital service book for cars and motorcycles. It reads a receipt from a garage or a filling station in any language and turns it into a complete record: parts, labour, cost, mileage. From there it builds a maintenance plan, works out real fuel consumption, keeps documents in an encrypted vault, and tracks tyres — including the date they were made, because rubber hardens with age rather than mileage.',
      'The app grew out of its developer’s own problem: he keeps an old Mitsubishi Pajero on the road and got tired of the shoebox of receipts in the glovebox. Maintra works offline, shows no ads and carries no tracking; the service history can be exported and taken elsewhere at any time.',
      'Free: one vehicle, the full service history, fuel logs, plan, reminders, tyres and documents. Paid covers only what the developer pays third parties for: receipt reading, the AI maintenance plan, and tyre photo analysis.',
    ],
    quotesH: 'Quotes from the developer',
    quotesNote: 'Take any of them, no need to ask.',
    quotes: [
      '“You remember the big repairs without an app. It is the small things that get lost: which filter exactly, how much went in, when it was last done. Three years on, that is not a car’s history any more — it is a pile of receipts in the glovebox.”',
      '“Everyone checks the tread before winter; almost nobody checks the date. After six years rubber hardens no matter how many millimetres are left on it.”',
      '“A registration document and an insurance policy are a full name, an address, a VIN and a signature in one file. So documents are encrypted on the phone before they go anywhere: the owner holds the only key, and there is no ‘recover my access’ button. That is inconvenient, and it is deliberate.”',
      '“I did not want to build another subscription. Anything that costs nothing to run stays free. The paid part is only what I pay third parties for myself.”',
    ],
    boilerH: 'Boilerplate — for the end of a piece',
    boiler: ['Maintra is a digital service book for cars and motorcycles: it reads garage receipts and keeps a maintenance plan, tyres and encrypted documents. It works offline and carries no ads. Built by one developer, ROK (Kyrylo Rozbeiko). Free on the App Store and Google Play. maintra.me'],
    logoH: 'Logo and icon',
    logos: [
      ['maintra-icon-1024.png', 'Icon, opaque background', 'PNG · 1024×1024', 'Maintra icon on an opaque background'],
      ['maintra-icon-1024-transparent.png', 'Icon, transparent background', 'PNG · 1024×1024 · alpha', 'Maintra icon with a transparent background'],
      ['maintra-logo.png', 'Logo', 'PNG · alpha', 'Maintra logo'],
      ['maintra-feature-1024x500.png', 'Feature graphic', 'PNG · 1024×500', 'Maintra feature graphic'],
    ],
    dl: 'Download',
    shotsH: 'Screenshots',
    shotsLede:
      'Screenshots in English. For Ukrainian, see the <a href="press.html">українська версія</a> of this page. Click any one for the full size.',
    cleanH: 'Clean screenshots',
    cleanNote: 'Just the app’s screen: no phone frame, no marketing text. Use these in an article — a slogan across the image reads as an advert.',
    storeH: 'Store screenshots',
    storeNote: 'The same screens as they appear on the App Store and Google Play — framed, with the slogan.',
    videoH: 'Video',
    videoNote: 'Coming: a 20–40 second screen recording with no music and no voiceover — one scenario, a photographed receipt becoming a record. As an MP4, plus a 5-second GIF for messaging channels.',
    photoH: 'Photo of the developer',
    photoNote: 'Coming: a landscape and a portrait shot, at least 2000 px on the long edge.',
    zipH: 'Everything in one download',
    zipNote: 'A zip will appear here once all the materials are in place.',
    qH: 'Questions',
    q: 'Write to <a href="mailto:rokops13@gmail.com">rokops13@gmail.com</a> — I answer every email. Same if you need material that is not here, or a figure with a current date on it.',
    footer: '<a href="index.html">Home</a> · <a href="about.html">About</a> · <a href="faq.html">FAQ</a> · <a href="privacy.html">Privacy</a>',
  },
};

const block = (paras) => `    <div class="copyblock">\n${paras.map((p) => `      <p>${p}</p>`).join('\n')}\n    </div>`;

function page(lang) {
  const t = T[lang];
  const file = lang === 'uk' ? 'press.html' : 'press-en.html';
  const logoGrid = t.logos
    .map(
      ([f, name, meta, alt]) => `      <div class="press-item">
        <img src="assets/press/${f}" alt="${alt}" />
        <div class="name">${name}</div>
        <div class="meta">${meta}</div>
        <a href="assets/press/${f}" download>${t.dl}</a>
      </div>`
    )
    .join('\n');

  return `<!DOCTYPE html>
<!-- Generated by tools/genpress.mjs — edit that, not this file. -->
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${t.title}</title>
  <meta name="description" content="${t.desc}" />
  <meta name="theme-color" content="#0A0A0A" />
  <link rel="canonical" href="https://maintra.me/${file}" />
  <link rel="alternate" hreflang="uk" href="https://maintra.me/press.html" />
  <link rel="alternate" hreflang="en" href="https://maintra.me/press-en.html" />
  <link rel="alternate" hreflang="x-default" href="https://maintra.me/press-en.html" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Maintra" />
  <meta property="og:locale" content="${lang === 'uk' ? 'uk_UA' : 'en_GB'}" />
  <meta property="og:title" content="${t.title}" />
  <meta property="og:description" content="${t.ogDesc}" />
  <meta property="og:url" content="https://maintra.me/${file}" />
  <meta property="og:image" content="https://maintra.me/assets/press/maintra-feature-1024x500.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="icon" type="image/png" href="assets/favicon.png" />
  <link rel="stylesheet" href="assets/style.css?v=20260915" />
  <link rel="stylesheet" href="assets/press.css?v=20260915" />
  <script src="assets/nav.js?v=20260915" defer></script>
</head>
<body>
  <div class="container">
    <header class="site-header">
      <a href="index.html"><img src="assets/logo.png" alt="Maintra logo" class="logo-img" /></a>
      <a href="index.html" class="brand" style="text-decoration:none;">Maintra</a>
      <nav>
${t.nav.map(([h, l]) => `        <a href="${h}">${l}</a>`).join('\n')}
        <a href="${t.other}" class="lang-switch" hreflang="${lang === 'uk' ? 'en' : 'uk'}">${t.otherLabel}</a>
      </nav>
    </header>

    <h1>${t.h1}</h1>
    <p class="lede">${t.lede}</p>

    <div class="permission">${t.permission}</div>

    <h2>${t.factsH}</h2>
    <p class="muted">${t.factsNote}</p>
    <table class="facts">
${t.facts.map(([k, v]) => `      <tr><td>${k}</td><td>${v}</td></tr>`).join('\n')}
    </table>

    <h2>${t.textsH}</h2>
    <p>${t.textsLede}</p>

    <h3>${t.oneH}</h3>
${block(t.one)}

    <h3>${t.fiftyH}</h3>
${block(t.fifty)}

    <h3>${t.longH}</h3>
${block(t.long)}

    <h3>${t.quotesH}</h3>
    <p class="muted">${t.quotesNote}</p>
${block(t.quotes)}

    <h3>${t.boilerH}</h3>
${block(t.boiler)}

    <h2>${t.logoH}</h2>
    <div class="press-grid">
${logoGrid}
    </div>

    <h2>${t.shotsH}</h2>
    <p class="lede">${t.shotsLede}</p>

    <h3>${t.cleanH}</h3>
    <p class="muted">${t.cleanNote}</p>
    <div class="shot-grid">
${gallery(lang, CLEAN, 'clean')}
    </div>

    <h3>${t.storeH}</h3>
    <p class="muted">${t.storeNote}</p>
    <div class="shot-grid">
${gallery(lang, STORE, 'store')}
    </div>

    <h2>${t.videoH}</h2>
    <p class="pending">${t.videoNote}</p>

    <h2>${t.photoH}</h2>
    <p class="pending">${t.photoNote}</p>

    <h2>${t.zipH}</h2>
    <p class="pending">${t.zipNote}</p>

    <h2>${t.qH}</h2>
    <p>${t.q}</p>

    <footer>
      <div>&copy; <span id="year">2026</span> Maintra</div>
      <div>${t.footer}</div>
    </footer>
  </div>
  <script>document.getElementById('year').textContent = new Date().getFullYear();</script>
</body>
</html>
`;
}

for (const lang of ['uk', 'en']) {
  const out = join(SITE, lang === 'uk' ? 'press.html' : 'press-en.html');
  writeFileSync(out, page(lang), 'utf8');
  console.log(out);
}
