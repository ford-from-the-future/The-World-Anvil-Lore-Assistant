# World Anvil Lore Assistant (WALA)

World Anvil Lore Assistant (WALA) is a local AI-powered tool that connects directly to a user’s World Anvil world via the Boromir API, enabling natural-language querying, cross-article discovery, and structured lore exploration. It integrates with Google Gemini for reasoning and generation, while storing user credentials securely on the local machine.

WALA functions as an intelligent retrieval-and-synthesis layer on top of World Anvil, returning AI-generated insights accompanied by direct links to the original articles referenced.

# World Anvil Lore Assistant (WALA)

World Anvil Lore Assistant (WALA) is a local AI-powered tool that connects to a user’s World Anvil world via the Boromir API and synthesizes answers using Google Gemini. It is intended to provide authoritative, citation-backed responses by retrieving actual article JSON from your World Anvil world and feeding those documents to an LLM for reasoning.

**Current State (2025-11-19)**

- **Live clients implemented**: `src/services/liveBoromirClient.js` and `src/services/liveGeminiClient.js` are wired to make real requests when `WALA_LIVE=true`.
- **Article-by-ID works**: `LiveBoromirClient.fetchArticle(id, granularity)` returns full article JSON for known IDs (verified for `71934432-3315-4b70-bb64-93d7efe2413d`).
- **Diagnostics & tooling**: Added multiple diagnostic and utility scripts under `scripts/` for identity/world checks, article fetching, RSS backups and conservative HTML ToC crawling.
- **Caveats**: Bulk discovery (HTML ToC crawling) is often blocked by Cloudflare from this environment (HTTP 403). RSS feeds may be empty depending on world settings. A local full-text index is not yet present — recommended next step.

**Project structure**

```
├── .env.example          # Template for required environment variables
├── package.json
├── README.md
├── scripts/              # Diagnostics, backup, crawler, and helpers
├── src/
│   ├── app.js            # Orchestration / pipeline
│   ├── config/env.js     # Env loader
│   └── services/         # Live Boromir & Gemini clients
└── data/                 # Backup output and extracted text
    ├── articles/
    └── extract/
```

**Key files**

- `src/services/liveBoromirClient.js` — Boromir API client (header + query-param auth, fetchArticle, paginated listing fallback)
- `src/services/liveGeminiClient.js` — Gemini call wrapper with retry/backoff
- `src/app.js` — Orchestrates search → fetch top articles → enrich → Gemini
- `scripts/` — `diag_*` diagnostics, `crawl_rss_and_fetch.js`, `backup.js`, `extract.js`, `crawl_toc_and_fetch.js`

**Environment variables (.env)**

Set these to enable live features (or use `.env`):

- `WALA_LIVE` — `true` to enable live network clients
- `WALA_APPLICATION_KEY` — World Anvil application key (header auth)
- `WALA_AUTH_TOKEN` — World Anvil auth token (if required)
- `WALA_WORLD_ID` — World UUID
- `WALA_WORLD_URL` — Public world URL base (used by crawlers)
- `WALA_RSS_URL` — RSS feed URL for the world (optional)
- `GOOGLE_GEMINI_API_KEY` — Gemini API key
- `WALA_WIDGET_API_BASE` — Mount path for the widget API bridge (default `/api/wala`)
- `WALA_WIDGET_ALLOWED_ORIGIN` — Optional origin value for CORS when embedding the widget cross-site

### Sidebar widget (Vite bundle)

The `widget/` directory ships a lightweight Vite build that renders a sidebar for asking the assistant about the current article. It auto-detects the article ID from query params (`?walaArticleId=...`), `data-article-id` attributes, or `<meta name="wala-article-id">` content. Authentication is user-supplied at runtime—no tokens are compiled into the bundle.

**Build the widget**

```bash
npm run widget:build
# outputs widget/dist/wala-widget.js and CSS assets
```

**Run the bridge server locally**

```bash
cp .env.example .env
export WALA_LIVE=true
npm install
npm run serve
# server listens on http://localhost:8788 and mounts the API at WALA_WIDGET_API_BASE
```

**Embed snippet**

Serve the contents of `widget/dist/` from your site (or proxy `/widget` from the provided server) and include:

```html
<script>
  window.WALA_WIDGET_CONFIG = {
    apiBase: '/api/wala', // or your deployed bridge URL
    articleId: null // optional override if your CMS exposes the id elsewhere
  };
</script>
<link rel="stylesheet" href="/widget/wala-widget-style.css" />
<script type="module" src="/widget/wala-widget.js"></script>
```

**API contract**

- `GET {WALA_WIDGET_API_BASE}/public-config` → returns `{ ok, config }` with non-secret world metadata and widget base path.
- `POST {WALA_WIDGET_API_BASE}/ask` → body `{ prompt, articleId? }`; headers may include `X-Wala-Auth-Token` (and optionally `X-Wala-Application-Key`) to supply per-user tokens. The bridge proxies to Boromir/Gemini and skips search when `articleId` is present.

**Common commands (PowerShell)**

Fetch a single article by ID (live):

```powershell
$env:WALA_LIVE='true';
node scripts/diag_fetch_article.js "71934432-3315-4b70-bb64-93d7efe2413d"
```

Run identity/world/gemini diagnostics:

```powershell
$env:WALA_LIVE='true'; node scripts/diag_identity.js
$env:WALA_LIVE='true'; node scripts/diag_world.js
$env:WALA_LIVE='true'; node scripts/diag_gemini.js
```

Start the CLI in live mode (example):

```powershell
$env:WALA_LIVE='true'; npm start -- "Who is Billy the Hero?"
```

Backup via RSS (if `WALA_RSS_URL` is set):

```powershell
$env:WALA_LIVE='true'; node scripts/backup.js
```

**Limitations & recommendations**

- Cloudflare may block HTML crawls from this environment (HTTP 403). To gather a complete article corpus, run `scripts/crawl_toc_and_fetch.js` on your local machine or provide a proxy that can access your world pages.
- The repo contains a paginated-list fallback in the Boromir client, but for reliable free-text search you should build a local full-text index. Suggested approach:
  - Add `scripts/build_index.js` using `flexsearch` or `lunr` to index article titles, excerpts and content.
  - Expose `npm run build-index` and wire `src/app.js` to consult the local index when remote search returns no results.
- Persist index and article metadata and add TTL/invalidation to avoid frequent re-crawls.

**Next actions I can take**

- Add a `scripts/build_index.js` and `npm run build-index` integration (I can implement this next).
- Wire search fallback to the local index and add a sample of querying the index from `src/app.js`.

If you'd like me to implement the index builder and the CLI command now, tell me and I'll add the script and update `package.json`.
