# Maintra — public site

Static HTML for Maintra's public-facing pages: landing, Privacy, Terms, account deletion, FAQ, Support, plus auth-bounce pages and SEO/AI-discoverability files. Hosted on GitHub Pages.

## Structure

```
maintra.public/
├── index.html              # Landing page — hero, features, pricing, FAQ teaser
├── privacy.html            # Privacy Policy
├── terms.html              # Terms of Service
├── delete-account.html     # Play-Store-compliant account deletion page
├── faq.html                # Frequently asked questions
├── support.html            # Contact & support
├── confirmed.html          # Email-confirmation bounce page (deep-links into app)
├── reset-password.html     # Password-reset bounce page
├── robots.txt              # Crawler permissions (explicitly allows AI bots)
├── sitemap.xml             # Lists all pages for search engines
├── llms.txt                # Markdown summary for LLM crawlers
└── assets/
    ├── style.css           # Shared stylesheet (dark theme, teal accent)
    ├── logo.png            # Header logo
    └── favicon.png         # Browser tab icon
```

No build step, no dependencies, no JavaScript bundler. Just static HTML + one CSS file.

## Canonical URL

Every page hard-codes `https://rozbeyko.github.io/maintra.public/` as the canonical host in:

- `<link rel="canonical">` in each HTML `<head>`
- `og:url` / `twitter` meta tags
- `robots.txt` (`Sitemap:` line)
- `sitemap.xml` (`<loc>` entries)
- `llms.txt` (page links)
- `index.html` JSON-LD (`url`, `image`, `Organization.url`, etc.)

**If you move to a custom domain** (e.g. `maintra.app`), do a global find-and-replace of `rozbeyko.github.io/maintra.public` and add a `CNAME` file containing the new domain on the root.

## Before publishing — placeholders

Each policy/terms HTML file still contains `REPLACE_ME_*` tokens you must fill in:

| Token | What to put there | Where it appears |
|---|---|---|
| `REPLACE_ME_EMAIL` | Support email | `privacy.html`, `terms.html`, `delete-account.html` |
| `REPLACE_ME_DEVELOPER_NAME` | Legal developer / company name | `privacy.html`, `terms.html` |
| `REPLACE_ME_DATE` | Effective date | `privacy.html`, `terms.html` |
| `REPLACE_ME_JURISDICTION` | Governing law jurisdiction | `terms.html` |

Find every occurrence:

```bash
grep -rn "REPLACE_ME_" .
```

## Publishing on GitHub Pages

1. Commit and push to the `main` branch of `rozbeyko/maintra.public`.
2. In the repo on GitHub: **Settings → Pages → Source: `main`, root folder**.
3. Live at `https://rozbeyko.github.io/maintra.public/` within ~1 minute.

For a custom domain: add a `CNAME` file with the domain, configure DNS per [GitHub's docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site).

## Play Console URLs (do not change without updating Play Console)

These exact filenames are registered with Google Play Console and must not move:

- **Privacy Policy URL** → `…/privacy.html`
- **Account Deletion URL** (Data safety → User data → Account deletion) → `…/delete-account.html`

## SEO & AI-discoverability checklist

### Already shipped in this repo
- [x] `MobileApplication` + `Organization` + `WebSite` + `FAQPage` JSON-LD on `index.html`
- [x] Open Graph + Twitter Card meta on every page (rich previews when shared)
- [x] Canonical URLs on every page
- [x] `robots.txt` explicitly allowing GPTBot, Google-Extended, ClaudeBot, PerplexityBot, CCBot, Applebot-Extended, Bytespider, cohere-ai, DuckAssistBot, YouBot, Amazonbot, Meta-ExternalAgent, MistralAI-User
- [x] `sitemap.xml` referenced from `robots.txt`
- [x] `llms.txt` (Markdown summary read by Perplexity, Cursor, and some other LLM clients)
- [x] Keyword-rich landing copy ("car maintenance app", "service history", "digital service book", etc.)

### To do once the site is live (dashboard tasks, no code)
- [ ] Submit `sitemap.xml` to [Google Search Console](https://search.google.com/search-console)
- [ ] Submit `sitemap.xml` to [Bing Webmaster Tools](https://www.bing.com/webmasters) — Bing matters for ChatGPT Search and Copilot
- [ ] Verify the site shows up in Google with a `site:rozbeyko.github.io/maintra.public` query (usually within a few days)

### Off-site work that actually moves the needle
- [ ] List on [AlternativeTo](https://alternativeto.net/) (car-maintenance category)
- [ ] List on [Product Hunt](https://www.producthunt.com/) (one-shot launch)
- [ ] Reddit posts: r/cars, r/Android, r/AutoMechanics, r/CarTalk, country-specific subs (r/ukraine, r/poland)
- [ ] Pitch a few Android-app review YouTubers and blogs
- [ ] Get the Play Store listing in shape (full long-description, 6-8 screenshots, feature graphic, video)

### Why this gets you mentioned by LLMs
AI assistants like ChatGPT, Gemini, Copilot, and Perplexity recommend apps via two paths: (1) **training data** (slow — your site has to be on the web, linked, mentioned), and (2) **live web search** (fast — the assistant queries Google/Bing in real time and cites whatever ranks well). The structured data, robots.txt allowlist, and llms.txt above primarily help path 2: when a user asks "best car maintenance app for Android," the assistant's web search needs to find your site, recognize it as an app landing page, and have a clean summary to quote. The off-site list (Reddit, AlternativeTo, Play Store) is what feeds path 1 over the next training cycle.

## Tone & design

- Dark theme matching the app: `#0F1624` background, `#00D1B2` teal accent.
- Inner pages: 760px max-width (`.container`). Landing page: 1080px (`.container.wide`).
- No tracking, no analytics, no cookies, no external fonts. Pure static HTML.
- Mobile-first; cards stack on narrow screens.
