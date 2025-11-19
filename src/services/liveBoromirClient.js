import { URL } from 'node:url';

export class LiveBoromirClient {
  constructor({ applicationKey, authToken, worldId }) {
    this.applicationKey = applicationKey;
    this.authToken = authToken;
    this.worldId = worldId;
  }

  get headers() {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'WALA (https://github.com/ford-from-the-future/The-World-Anvil-Lore-Assistant, 0.1.0)',
    };

    if (this.applicationKey) headers['x-application-key'] = this.applicationKey;
    if (this.authToken) headers['x-auth-token'] = this.authToken;

    return headers;
  }

  async tryFetchJson(url) {
    const res = await fetch(url, { headers: this.headers });
    const text = await res.text();
    try {
      return { ok: res.ok, status: res.status, json: JSON.parse(text) };
    } catch (e) {
      return { ok: res.ok, status: res.status, text };
    }
  }

  async fetchWorldMetadata() {
    if (!this.worldId) {
      throw new Error('WALA_WORLD_ID is required for live Boromir requests');
    }

    // Use the documented Boromir base path. Try a few granularity settings.
    const base = 'https://www.worldanvil.com/api/external/boromir';
    const qp = (u) => {
      const ak = encodeURIComponent(this.applicationKey || '');
      const at = encodeURIComponent(this.authToken || '');
      if (ak && at) return `${u}${u.includes('?') ? '&' : '?'}x-application-key=${ak}&x-auth-token=${at}`;
      return u;
    };

    const candidates = [
      // Try the documented singular 'world' query endpoint first (returns JSON)
      `${base}/world?id=${this.worldId}&granularity=2`,
      `${base}/world?id=${this.worldId}&granularity=1`,
      `${base}/world?id=${this.worldId}`,
      qp(`${base}/world?id=${this.worldId}&granularity=2`),
      qp(`${base}/world?id=${this.worldId}&granularity=1`),
      qp(`${base}/world?id=${this.worldId}`),

      // Preferred header-based requests with plural 'worlds' path (older/alternate)
      `${base}/worlds/${this.worldId}?granularity=2`,
      `${base}/worlds/${this.worldId}?granularity=1`,
      `${base}/worlds/${this.worldId}`,
      // Try the same endpoints but with tokens as query params (CORS/auth fallback)
      qp(`${base}/worlds/${this.worldId}?granularity=2`),
      qp(`${base}/worlds/${this.worldId}?granularity=1`),
      qp(`${base}/worlds/${this.worldId}`),

      // legacy fallback
      qp(`https://api.worldanvil.com/boromir/v1/worlds/${this.worldId}`),
    ];

    let lastResult = null;
    for (const url of candidates) {
      try {
        const result = await this.tryFetchJson(url);
        lastResult = { url, result };
        if (result.ok && result.json) {
          // Attempt to map the response to the expected shape
          const body = result.json;
          const title = body.title || body.name || (body.world && body.world.title);
          const description = body.description || (body.world && body.world.description) || '';
          const tags = body.tags || body.world?.tags || [];

          return {
            worldId: this.worldId,
            title: title || `World ${this.worldId}`,
            description: description || '',
            tags: Array.isArray(tags) ? tags : [],
          };
        }

        // If the endpoint returned a non-JSON success payload (e.g. an HTML
        // page such as a Cloudflare challenge), do NOT return early here. We
        // want to continue trying other candidate endpoints (some hosts expose
        // the same resource at different paths). We'll record the lastResult
        // and handle fallbacks after all candidates have been attempted.

        // If the response contained an HTML page (Cloudflare or similar),
        // treat that as a known blocking condition and return a limited
        // fallback metadata object so the flow can continue.
        if (typeof result.text === 'string' && /<!doctype html|enable javascript and cookies|cloudflare/i.test(result.text)) {
          return {
            worldId: this.worldId,
            title: `World ${this.worldId} (unavailable - remote returned HTML)` ,
            description: 'Remote Boromir endpoint returned an HTML page (possibly Cloudflare protection). Using limited fallback metadata.',
            tags: [],
          };
        }
      } catch (err) {
        lastResult = { url, error: err };
      }
    }

    // If we reached here nothing worked. If the last attempt returned an
    // HTML page, return a limited fallback metadata rather than failing.
    const lastText = lastResult?.result?.text;
    if (typeof lastText === 'string' && /<!doctype html|enable javascript and cookies|cloudflare/i.test(lastText)) {
      return {
        worldId: this.worldId,
        title: `World ${this.worldId} (unavailable - remote returned HTML)` ,
        description: 'Remote Boromir endpoint returned an HTML page (possibly Cloudflare protection). Using limited fallback metadata.',
        tags: [],
      };
    }

    const details = lastResult?.result?.text || JSON.stringify(lastResult?.result?.json || lastResult?.error || lastResult);
    throw new Error(`Failed to fetch world metadata from Boromir endpoints. Last response: ${details}`);
  }

  async searchArticles(query) {
    if (!query) return [];
    if (!this.worldId) return [];

    // Try a plausible search endpoint. Fallback to the world articles listing.
    const encoded = encodeURIComponent(query);
    const base = 'https://www.worldanvil.com/api/external/boromir';
    const qp = (u) => {
      const ak = encodeURIComponent(this.applicationKey || '');
      const at = encodeURIComponent(this.authToken || '');
      if (ak && at) return `${u}${u.includes('?') ? '&' : '?'}x-application-key=${ak}&x-auth-token=${at}`;
      return u;
    };

    const candidates = [
      // Try search/article endpoints with and without query-param auth
      `${base}/worlds/${this.worldId}/search?query=${encoded}&granularity=1`,
      `${base}/worlds/${this.worldId}/articles?search=${encoded}&granularity=1`,
      `${base}/worlds/${this.worldId}/articles?granularity=1`,
      qp(`${base}/worlds/${this.worldId}/search?query=${encoded}&granularity=1`),
      qp(`${base}/worlds/${this.worldId}/articles?search=${encoded}&granularity=1`),
      qp(`${base}/worlds/${this.worldId}/articles?granularity=1`),
      // legacy fallback
      qp(`https://api.worldanvil.com/boromir/v1/worlds/${this.worldId}/search?query=${encoded}`),
    ];

    for (const url of candidates) {
      try {
        const result = await this.tryFetchJson(url);
        if (result.ok && result.json) {
          const items = result.json.articles || result.json.items || result.json.results || result.json;
          if (Array.isArray(items)) {
            return items.slice(0, 10).map((it) => ({
              id: it.id || it._id || it.slug || it.url || JSON.stringify(it).slice(0, 32),
              title: it.title || it.name || it.heading || 'Untitled',
              url: it.url || it.link || (it.slug ? `https://www.worldanvil.com/w/${it.slug}` : ''),
              excerpt: it.excerpt || it.summary || it.description || '',
            }));
          }
        }
      } catch (err) {
        // try next
      }
    }

    // If none of the endpoints worked return empty array rather than failing
    return [];
  }
}
