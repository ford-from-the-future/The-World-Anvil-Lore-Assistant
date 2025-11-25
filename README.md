# World Anvil Lore Assistant Widget

A lightweight sidebar widget that provides AI-powered Q&A about the current World Anvil article you're viewing. The widget automatically detects the article ID and connects to your World Anvil world via the Boromir API, synthesizing answers using Google Gemini.

## Features

- **Auto-detection** — Detects the current article ID from query params, DOM attributes, or meta tags
- **Context-aware** — Answers questions specifically about the current article or your entire world
- **Citation-backed** — Returns AI responses with direct links to referenced articles
- **Secure** — Auth tokens are entered per-session in the browser and never stored on the server
- **Lightweight** — Built with Vite, embeds as a single JS bundle with CSS

## Setup

### 1. Install dependencies

```bash
npm install
npm --prefix widget install
```

### 2. Build the widget

```bash
npm run widget:build
# outputs: widget/dist/wala-widget.js and widget/dist/wala-widget-style.css
```

### 3. Configure environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required variables:
- `WALA_APPLICATION_KEY` — Your World Anvil application key
- `GOOGLE_GEMINI_API_KEY` — Your Google Gemini API key
- `WALA_WORLD_ID` — Your World Anvil world UUID

Optional:
- `WALA_WIDGET_ALLOWED_ORIGIN` — CORS origin if embedding cross-site
- `PORT` — Server port (default: 8788)

### 4. Start the server

```bash
npm run serve
```

The widget API will be available at `http://localhost:8788/api/wala`.

## Embedding the Widget

Serve the widget files from your site and include this snippet on any World Anvil article page:

```html
<script>
  window.WALA_WIDGET_CONFIG = {
    apiBase: '/api/wala', // or your deployed bridge URL
    articleId: null // optional override; widget auto-detects if null
  };
</script>
<link rel="stylesheet" href="/widget/wala-widget-style.css" />
<script type="module" src="/widget/wala-widget.js"></script>
```

The widget will:
1. Auto-detect the article ID from the page
2. Inject a sidebar asking you to enter your auth token
3. Allow you to ask questions with the current article as context
4. Display AI-generated answers with citation links

## API Contract

### `GET {WALA_WIDGET_API_BASE}/public-config`

Returns non-secret world metadata and widget configuration.

**Response:**
```json
{
  "ok": true,
  "config": {
    "widgetApiBase": "/api/wala",
    "worldName": "My World",
    "worldId": "..."
  }
}
```

### `POST {WALA_WIDGET_API_BASE}/ask`

Submit a question about the current article or world.

**Request body:**
```json
{
  "prompt": "What is the history of this place?",
  "articleId": "optional-article-uuid"
}
```

**Headers:**
- `X-Wala-Auth-Token` — Your World Anvil auth token
- `X-Wala-Application-Key` — (optional) Your application key

**Response:**
```json
{
  "ok": true,
  "result": {
    "question": "What is the history of this place?",
    "world": { ... },
    "articles": [ ... ],
    "aiResponse": {
      "summary": "...",
      "references": [
        { "id": "...", "title": "...", "url": "..." }
      ]
    },
    "generatedAt": "2025-11-25T..."
  }
}
```

## Development

Watch mode for the widget:

```bash
npm run widget:dev
# Vite dev server runs on http://localhost:5173
```

## License

MIT
