# Version Extractor v2 (Node.js · SQLite/MySQL · Material Design 3)

Extracts the **latest and previous version** of products from changelog pages, falls back to OpenAI web
search, and processes everything through a database-backed background job queue.

## What's new in v2
* **Previous version** column, next to Version. It's extracted from the changelog (the next lower release), from GitHub
  releases/tags, or from AI. If none is found, the version we stored before becomes the previous one.
* **Select all across pages.** You can then untick individual rows and bulk actions skip them.
* **Material Design 3 UI** with a light/dark toggle (saved per browser), a responsive layout, tables that turn
  into cards on phones, a navigation drawer that slides in from the left on mobile (also opens with a swipe), and a back-to-top button.
* **In-page login and dialogs.** No browser popups: sign-in, confirmations and "type DELETE" prompts are all inside the website.

## Desktop sidebar toggle (new)
The button at the top-left of the app bar (or **Ctrl+B**) hides or shows the sidebar on desktop. When it's hidden, the page uses the
full screen width. Your choice is remembered in the browser. On mobile the ☰ button still opens the slide-in menu.

## Version updates & custom export
* Every product records **when its version number actually changed** (`version_changed_at`). This happens when a version
  is found for the first time, a newer release is found, or you edit the version by hand. Re-checking a product
  that still has the same version does **not** mark it as updated.
* The Products page has an **Updated** column with a TODAY badge, a **Today** stat card, a **Version updated** filter
  (Today, Yesterday, Last 7 days, Last 30 days, or a custom date range) and a **Previous version** filter (has / none).
* **Export updated today** opens the export dialog with the "Version only" columns
  (Product ID, SKU, Name, Version, Previous version, Updated on) already selected.
* The export dialog lets you choose **which products** (selected, all matching filters, updated today, or a date range)
  and **which columns**. Your column choice is remembered in the browser.

## Sitemap module
Menu → **Sitemap**
1. Choose a source with the **Sitemap URL / Paste text** switch (your choice is remembered).
   * **Paste text**: paste anything that contains links (a URL list, HTML, CSV, JSON, e-mail text or raw sitemap XML),
     or load a .txt / .csv / .xml file. Every unique http(s) URL is extracted, and a live counter shows how many were found.
     Pasted sitemap XML is parsed like a real sitemap (an index is followed). With **Follow sitemap links** on, links ending in
     `.xml`, `.xml.gz`, `robots.txt` or containing "sitemap" are crawled instead of being added as pages.
     After that, the steps are the same as for a sitemap URL: include/exclude filters, naming rules, flags, de-duplication,
     clean-up, import. Rows from pasted text show the source "(pasted text)".
   * **Sitemap URL**: paste a sitemap URL: `sitemap.xml`, a sitemap index (followed recursively), `.xml.gz`, or `robots.txt`. Click **Extract URLs**.
   Duplicate URLs are ignored automatically.
2. Each URL slug becomes a clean name: `adobe-photoshop_pro-12345.html` → **Adobe Photoshop Pro**.
   The rules: `-` and `_` become spaces, file extensions are removed, trailing IDs are removed (years are kept), Title Case
   is applied, and brand names are fixed (WordPress, WooCommerce, SEO, iOS…). Options let you take the name from the last
   or second-last path segment or a query parameter, remove words, and include/exclude URLs or child sitemaps (regex).
   A live preview shows the name for any URL.
3. Every name is flagged **has numbers** and/or **has special characters**. Filter by these, or click the stat cards.
4. **Quick bulk clean-up** (applies to all matching URLs on every page): delete URLs with numbers, delete URLs with
   special characters, remove numbers from names, remove special characters from names.
5. **Clean names** menu (on the current selection, which can include every page): remove numbers / special
   characters, Title Case, remove words, find & replace (text or regex), regenerate from URL, AI beautify, reset status.
6. **Import as products**: creates products with their page URL (optional duplicate check by Regex or AI, optional
   extraction queue). Rows are marked *imported* or *skipped*. Export the list as CSV at any time.

## Run locally (Windows)
```bash
cd Desktop\version-extractor
copy .env.example .env      # set ADMIN_USER / ADMIN_PASS
npm install
npm start                   # http://localhost:3000
```
Requires **Node.js 22.13+** (built-in SQLite). The DB file is created at `Desktop\version-extractor.sqlite`.
Existing databases from v1 are upgraded automatically (the `previous_version` column is added on start).

## Database
* SQLite by default (`SQLITE_PATH`, otherwise Desktop, otherwise `./data/` on servers).
* Fill in `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` and restart → MySQL is used automatically (`DB_CLIENT=auto`).
* `npm run sqlite-to-mysql` copies existing data.

## Deploy on Hostinger (Business / Cloud plan, "Node.js web app")
1. hPanel → Websites → Add Website → Node.js web app → GitHub or upload zip. Node **22 or 24**, entry `server.js`.
2. Environment variables: `ADMIN_USER`, `ADMIN_PASS`, `CRON_KEY`, `OPENAI_API_KEY` (+ `DB_*` for MySQL, recommended on hosting
   because a redeploy can replace the app folder and the SQLite file in it).
3. Cron job (safety net for the background queue):
   `curl -s "https://YOUR-DOMAIN/cron/run?key=YOUR_CRON_KEY" > /dev/null`

## Login
`ADMIN_USER` / `ADMIN_PASS` are checked by an in-page form. Sessions are signed HttpOnly cookies (12 h, or 30 days with
"Keep me signed in"). After 10 failed attempts an IP is blocked for 15 minutes. Set `SESSION_SECRET` to a long random string
in production. If both admin values are empty, login is disabled.

## Processing order (mode = Both)
1. Changelog jobs (priority 10), all of them first
2. AI "find changelog URL" jobs (20) for products without one → then their changelog is parsed
3. AI version search jobs (30) only for products still missing a version

## CSV
Import headers (case-insensitive): `product_id`, `sku`, `name`, `product_url`, `changelog_url`, `version`, `previous_version`.
Export columns: `id, product_id, sku, name, product_url, changelog_url, version, previous_version, version_source, source_url, status, last_error, notes, checked_at, created_at`.
