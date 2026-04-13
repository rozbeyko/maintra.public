# Maintra — public site

Static HTML for Maintra's public-facing pages: landing page, Privacy Policy, Terms of Service, account deletion instructions, FAQ, and Support. Designed to be hosted on GitHub Pages (free tier requires a public repo).

## Structure

```
site/
├── index.html            # Landing page
├── privacy.html          # Privacy Policy
├── terms.html            # Terms of Service
├── delete-account.html   # Play-Store-compliant account deletion page
├── faq.html              # Frequently asked questions
├── support.html          # Contact & support
└── assets/
    ├── style.css         # Shared stylesheet (dark theme, teal accent)
    ├── logo.png          # Header logo
    └── favicon.png       # Browser tab icon
```

No build step, no dependencies, no JavaScript bundler. Just static HTML + one CSS file. Open any `.html` in a browser to preview.

## Before publishing — replace these placeholders

Every HTML file contains `REPLACE_ME_*` tokens that must be filled in before the site goes live. Do a global find-and-replace in the `site/` folder:

| Token | What to put there | Where it appears |
|---|---|---|
| `REPLACE_ME_EMAIL` | Support email (e.g. `support@maintra.app`) | `privacy.html`, `terms.html`, `delete-account.html`, `support.html` |
| `REPLACE_ME_DEVELOPER_NAME` | Legal name of the developer / company (e.g. `Jane Doe` or `Maintra Software s.r.o.`) | `privacy.html`, `terms.html` |
| `REPLACE_ME_DATE` | Effective date in `YYYY-MM-DD` or `Month D, YYYY` format | `privacy.html`, `terms.html` |
| `REPLACE_ME_JURISDICTION` | Governing law jurisdiction (e.g. `Poland`, `Ukraine`, `England and Wales`) | `terms.html` |

You can find every occurrence with:

```bash
grep -rn "REPLACE_ME_" site/
```

## Publishing on GitHub Pages

1. Create a new **public** repository on GitHub (e.g. `maintra-site`).
2. Copy the contents of this `site/` folder into the root of that repo.
3. Commit and push.
4. In the repo on GitHub: **Settings → Pages → Build and deployment → Source: `main` branch, `/ (root)` folder**.
5. Your site will be live at `https://<your-username>.github.io/<repo-name>/` within a minute or two.

If you own a custom domain (e.g. `maintra.app`), you can add a `CNAME` file and configure DNS per GitHub's docs.

## Updating the Play Console listing

Once the site is live, plug these URLs into Google Play Console:

- **Privacy policy URL** → `https://<your-site>/privacy.html`
- **Account deletion URL** (Data safety → User data → Account deletion) → `https://<your-site>/delete-account.html`

## Tone & design

- Dark theme matching the app: `#0F1624` background, `#00D1B2` teal accent.
- No tracking, no analytics, no cookies, no external fonts. Pure static HTML.
- Mobile-first: content max-width is 760px; cards stack on narrow screens.
- Each page is self-contained — edit freely, no templating involved.
