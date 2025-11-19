Question: What mysteries lie within the royal archives?
Generated: 2025-11-19T05:32:39.242Z

World
 - Title: World Anvil Lore Assistant (sample world)
 - Description: A placeholder world used to bootstrap the Lore Assistant before real API wiring is added.
 - Tags: prototype, bootstrap

AI Summary
 I looked at World Anvil Lore Assistant (sample world) (ff3ba58b-03bc-4cc1-bab0-9172627637f4). I referenced 2 articles: Getting started with the Boromir API, Integrating AI reasoning. Based on that, here is a helpful response to "What mysteries lie within the royal archives?".

References
 - Getting started with the Boromir API: https://www.worldanvil.com/w/sample-world/boromir-api
 - Integrating AI reasoning: https://www.worldanvil.com/w/sample-world/ai-reasoning
```

> **Note:** The output above mirrors the CLI response using the provided sample question. Real timestamps and API responses may differ once live integrations replace the mock services.
```markdown
Question: What mysteries lie within the royal archives?
Generated: 2025-11-19T05:32:39.242Z

World
 - Title: World Anvil Lore Assistant (sample world)
 - Description: A placeholder world used to bootstrap the Lore Assistant before real API wiring is added.
 - Tags: prototype, bootstrap

AI Summary
 I looked at World Anvil Lore Assistant (sample world) (ff3ba58b-03bc-4cc1-bab0-9172627637f4). I referenced 2 articles: Getting started with the Boromir API, Integrating AI reasoning. Based on that, here is a helpful response to "What mysteries lie within the royal archives?."

References
 - Getting started with the Boromir API: https://www.worldanvil.com/w/sample-world/boromir-api
 - Integrating AI reasoning: https://www.worldanvil.com/w/sample-world/ai-reasoning
```

> **Note:** The output above mirrors the CLI response using the provided sample question. Real timestamps and API responses may differ once live integrations replace the mock services.

# Manual test log

This document contains an example of the mock/manual test output (above) and a short live-example you can run locally (or in an environment with valid credentials).

## Scenario (mock)
- **Command**: `npm start -- "What mysteries lie within the royal archives?"`
- **Environment**: Fallback/sample payloads used by the repo when `WALA_LIVE` is not enabled.

## Live example (verified article ID)

The repository can fetch individual articles by ID from the Boromir API when `WALA_LIVE=true` and valid credentials are present. The following shows how to run a short live check using a verified article ID.

PowerShell command (fetch article by ID):

```powershell
$env:WALA_LIVE='true';
node scripts/diag_fetch_article.js "71934432-3315-4b70-bb64-93d7efe2413d"
```

Expected output excerpt (shortened):

```
Fetching article id: 71934432-3315-4b70-bb64-93d7efe2413d
{
	"id": "71934432-3315-4b70-bb64-93d7efe2413d",
	"title": "Billy the Hero",
	"wordcount": 6095,
	"url": "https://www.worldanvil.com/w/seven-seals-legendarium-sixpathssage/a/billy-the-hero-person",
	...
}
```

Regenerate the CLI manual test output using live integrations (example):

```powershell
$env:WALA_LIVE='true'; npm start -- "Who is Billy the Hero?"
```

Notes & caveats

- If the environment does not have valid Boromir credentials or is blocked by Cloudflare for HTML crawling, some bulk discovery scripts (RSS / ToC crawl) may return no items or HTTP 403 pages. Single-article fetches (by ID) have been verified to work in this repo for the sample ID above.
- Use `scripts/diag_identity.js` and `scripts/diag_world.js` to verify your credentials and world visibility before running full backups/crawls.

---

If you want, I can also update the manual-test to include a captured live output file in `docs/` after you run the command locally and paste the resulting output here, or I can run it here if you provide a proxy that bypasses Cloudflare blocking.
