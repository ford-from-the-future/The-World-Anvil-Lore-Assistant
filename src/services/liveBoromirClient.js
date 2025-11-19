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

  async fetchCategory(id, granularity = 1) {
    if (!id) return null;

    const base = 'https://www.worldanvil.com/api/external/boromir';
    const qp = (u) => {
      const ak = encodeURIComponent(this.applicationKey || '');
      const at = encodeURIComponent(this.authToken || '');
      if (ak && at) return `${u}${u.includes('?') ? '&' : '?'}x-application-key=${ak}&x-auth-token=${at}`;
      return u;
    };

    const candidates = [
      `${base}/category?id=${encodeURIComponent(id)}&granularity=${encodeURIComponent(granularity)}`,
      `${base}/category?id=${encodeURIComponent(id)}`,
      qp(`${base}/category?id=${encodeURIComponent(id)}&granularity=${encodeURIComponent(granularity)}`),
      qp(`${base}/category?id=${encodeURIComponent(id)}`),
      `${base}/categories/${encodeURIComponent(id)}?granularity=${encodeURIComponent(granularity)}`,
      `${base}/categories/${encodeURIComponent(id)}`,
      qp(`${base}/categories/${encodeURIComponent(id)}?granularity=${encodeURIComponent(granularity)}`),
    ];

    for (const url of candidates) {
      try {
        const result = await this.tryFetchJson(url);
        if (result.ok && result.json) {
          const body = result.json;
          // Attempt to extract related articles from a category response
          const related = body.articles || body.items || body.related || body.relationships || [];
          return {
            id: body.id || id,
            title: body.title || body.name || '',
            slug: body.slug || '',
            url: body.url || '',
            granularity,
            raw: body,
            related: Array.isArray(related) ? related : [],
          };
        }
      } catch (err) {
        // try next candidate
      }
    }

    return null;
  }

  async searchArticles(query, categoryId = null) {
    if (!query && !categoryId) return [];
    if (!this.worldId) return [];

    // If a category id was provided, attempt to fetch the category and
    // search only inside its related articles first.
    if (categoryId) {
      try {
        const cat = await this.fetchCategory(categoryId, 1);
        if (cat && Array.isArray(cat.related) && cat.related.length > 0) {
          const q = String(query || '').toLowerCase();
          const items = cat.related.filter((it) => {
            const title = (it.title || it.name || it.heading || '').toString().toLowerCase();
            const id = (it.id || it._id || it.slug || '').toString().toLowerCase();
            const excerpt = (it.excerpt || it.summary || it.description || '').toString().toLowerCase();
            if (!q) return true;
            return title.includes(q) || id === q || excerpt.includes(q);
          });

          if (items.length > 0) {
            return items.slice(0, 10).map((it) => ({
              id: it.id || it._id || it.slug || it.url || JSON.stringify(it).slice(0, 32),
              title: it.title || it.name || it.heading || 'Untitled',
              url: it.url || it.link || (it.slug ? `https://www.worldanvil.com/w/${it.slug}` : ''),
              excerpt: it.excerpt || it.summary || it.description || '',
            }));
          }
        }
      } catch (err) {
        // ignore and fall back to world search
      }
    }

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

    // If remote search endpoints returned nothing, attempt a paginated
    // listing of articles from the world and perform an exact-text
    // filter on the real article metadata (title/excerpt/slug). This
    // keeps results based on actual World Anvil data rather than any
    // generated or fuzzy local content.
    try {
      const all = await this.listAllArticles({ pageSize: 50, limit: 1000 });
      if (Array.isArray(all) && all.length > 0) {
        const q = String(query || '').toLowerCase();
        const filtered = all.filter((it) => {
          if (!q) return true;
          const title = (it.title || '').toString().toLowerCase();
          const excerpt = (it.excerpt || it.summary || '').toString().toLowerCase();
          const slug = (it.slug || it.id || '').toString().toLowerCase();
          return title.includes(q) || excerpt.includes(q) || slug.includes(q);
        }).slice(0, 50);

        return filtered.map((it) => ({
          id: it.id || it._id || it.slug || it.url || JSON.stringify(it).slice(0, 32),
          title: it.title || it.name || it.heading || 'Untitled',
          url: it.url || it.link || (it.slug ? `https://www.worldanvil.com/w/${it.slug}` : ''),
          excerpt: it.excerpt || it.summary || it.description || '',
        }));
      }
    } catch (e) {
      // ignore and return empty
    }

    // Nothing found
    return [];
  }

  /**
   * Attempt to list all articles for the configured world using
   * paginated article endpoints. Returns an array of article
   * metadata objects (id, title, slug, excerpt, url) when available.
   */
  async listAllArticles({ pageSize = 50, limit = 1000 } = {}) {
    if (!this.worldId) return [];

    const base = 'https://www.worldanvil.com/api/external/boromir';
    const qp = (u) => {
      const ak = encodeURIComponent(this.applicationKey || '');
      const at = encodeURIComponent(this.authToken || '');
      if (ak && at) return `${u}${u.includes('?') ? '&' : '?'}x-application-key=${ak}&x-auth-token=${at}`;
      return u;
    };

    const results = [];
    let page = 1;
    let fetched = 0;
    while (fetched < limit) {
      const candidates = [
        `${base}/worlds/${this.worldId}/articles?page=${page}&pageSize=${pageSize}&granularity=1`,
        `${base}/worlds/${this.worldId}/articles?page=${page}&pageSize=${pageSize}`,
        qp(`${base}/worlds/${this.worldId}/articles?page=${page}&pageSize=${pageSize}&granularity=1`),
        qp(`${base}/worlds/${this.worldId}/articles?page=${page}&pageSize=${pageSize}`),
        // alternate path
        `${base}/articles?page=${page}&pageSize=${pageSize}&worldId=${this.worldId}&granularity=1`,
        qp(`${base}/articles?page=${page}&pageSize=${pageSize}&worldId=${this.worldId}&granularity=1`),
      ];

      let pageItems = null;
      for (const url of candidates) {
        try {
          const res = await this.tryFetchJson(url);
          if (res.ok && res.json) {
            const items = res.json.articles || res.json.items || res.json.results || res.json;
            if (Array.isArray(items) && items.length > 0) {
              pageItems = items;
              break;
            }
          }
        } catch (err) {
          // try next
        }
      }

      if (!pageItems || pageItems.length === 0) break;

      for (const it of pageItems) {
        results.push({
          id: it.id || it._id || it.slug || it.url || JSON.stringify(it).slice(0, 32),
          title: it.title || it.name || it.heading || 'Untitled',
          slug: it.slug || '',
          excerpt: it.excerpt || it.summary || it.description || '',
          url: it.url || it.link || (it.slug ? `https://www.worldanvil.com/w/${it.slug}` : ''),
        });
        fetched += 1;
        if (fetched >= limit) break;
      }

      if (pageItems.length < pageSize) break; // last page
      page += 1;
    }

    return results;
  }

  /**
   * Fetch a single article by id using Boromir documented paths.
   * Returns a normalized article object with content when available.
   * @param {string} id
   * @param {number|string} granularity
   */
  async fetchArticle(id, granularity = 1) {
    if (!id) return null;

    const base = 'https://www.worldanvil.com/api/external/boromir';
    const qp = (u) => {
      const ak = encodeURIComponent(this.applicationKey || '');
      const at = encodeURIComponent(this.authToken || '');
      if (ak && at) return `${u}${u.includes('?') ? '&' : '?'}x-application-key=${ak}&x-auth-token=${at}`;
      return u;
    };

    const candidates = [
      `${base}/article?id=${encodeURIComponent(id)}&granularity=${encodeURIComponent(granularity)}`,
      `${base}/article?id=${encodeURIComponent(id)}`,
      qp(`${base}/article?id=${encodeURIComponent(id)}&granularity=${encodeURIComponent(granularity)}`),
      qp(`${base}/article?id=${encodeURIComponent(id)}`),
      `${base}/articles/${encodeURIComponent(id)}?granularity=${encodeURIComponent(granularity)}`,
      `${base}/articles/${encodeURIComponent(id)}`,
      qp(`${base}/articles/${encodeURIComponent(id)}?granularity=${encodeURIComponent(granularity)}`),
    ];

    let lastResult = null;
    for (const url of candidates) {
      try {
        const result = await this.tryFetchJson(url);
        lastResult = { url, result };
        if (result.ok && result.json) {
          const body = result.json;
          // Map a few likely fields to a normalized shape
          return {
            id: body.id || id,
            title: body.title || body.name || '',
            url: body.url || body.link || '',
            slug: body.slug || '',
            granularity,
            contentParsed: body.contentParsed || body.descriptionParsed || body.body || body.text || null,
            contentRaw: body.content || body.description || null,
            templateFields: body.template || body.templateFields || null,
            tags: body.tags || null,
            raw: body,
          };
        }
      } catch (err) {
        lastResult = { url, error: err };
      }
    }

    return null;
  }
}
