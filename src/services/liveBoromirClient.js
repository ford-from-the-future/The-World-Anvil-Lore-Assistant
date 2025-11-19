import { URL } from 'node:url';

export class LiveBoromirClient {
  constructor({ applicationKey, authToken, worldId }) {
    this.applicationKey = applicationKey;
    this.authToken = authToken;
    this.worldId = worldId;
  }

  get headers() {
    return {
      'X-Application-Key': this.applicationKey,
      Authorization: this.authToken ? `Bearer ${this.authToken}` : undefined,
      Accept: 'application/json',
    };
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

    // Try a few plausible Boromir/world-anvil endpoints. If they all fail,
    // surface the last error so the caller can see what happened.
    const candidates = [
      `https://api.worldanvil.com/boromir/v1/worlds/${this.worldId}`,
      `https://api.worldanvil.com/worlds/${this.worldId}`,
      `https://www.worldanvil.com/api/worlds/${this.worldId}`,
      `https://www.worldanvil.com/boromir/worlds/${this.worldId}`,
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

        // If the endpoint returned a non-JSON success payload (e.g. an HTML page
        // such as a Cloudflare challenge), gracefully fall back to a limited
        // metadata response instead of throwing. This lets the assistant run
        // the rest of its flow even when the remote site blocks automated
        // requests.
        if (result.ok && !result.json && typeof result.text === 'string') {
          return {
            worldId: this.worldId,
            title: `World ${this.worldId} (unavailable - remote returned non-JSON)` ,
            description: 'Remote Boromir endpoint returned non-JSON content (possibly Cloudflare). Using limited fallback metadata.',
            tags: [],
          };
        }

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
    const candidates = [
      `https://api.worldanvil.com/boromir/v1/worlds/${this.worldId}/search?query=${encoded}`,
      `https://api.worldanvil.com/worlds/${this.worldId}/articles?search=${encoded}`,
      `https://www.worldanvil.com/api/worlds/${this.worldId}/articles?search=${encoded}`,
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
