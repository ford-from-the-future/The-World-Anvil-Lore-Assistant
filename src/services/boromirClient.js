const BOROMIR_BASE_URL = 'https://www.worldanvil.com/api/external/ai/boromir';
const DEFAULT_TIMEOUT_MS = 12_000;
const SEARCH_LIMIT = 5;

/**
 * Boromir API client used to retrieve world and article metadata from World Anvil.
 * Falls back to predictable mock data whenever credentials are missing or
 * network errors prevent a live response, so the rest of the app keeps working
 * during development.
 */
export class BoromirClient {
  constructor({ applicationKey, authToken, worldId } = {}) {
    this.applicationKey = applicationKey;
    this.authToken = authToken;
    this.worldId = worldId;
  }

  /**
   * @returns {Promise<import('../types/models.js').WorldMetadata>}
   */
  async fetchWorldMetadata() {
    if (!this.#hasCredentials()) {
      return this.#mockWorldMetadata();
    }

    try {
      const payload = await this.#request(`/worlds/${encodeURIComponent(this.worldId)}`);
      return this.#normalizeWorld(payload);
    } catch (error) {
      console.warn('[boromir] Falling back to mock world metadata:', error.message);
      return this.#mockWorldMetadata();
    }
  }

  /**
   * @param {string} query
   * @returns {Promise<import('../types/models.js').ArticleSummary[]>}
   */
  async searchArticles(query) {
    const trimmed = query?.trim();
    if (!trimmed) {
      return [];
    }

    if (!this.#hasCredentials()) {
      return this.#mockArticles(trimmed);
    }

    try {
      const params = new URLSearchParams({
        query: trimmed,
        limit: String(SEARCH_LIMIT),
      });
      const payload = await this.#request(
        `/worlds/${encodeURIComponent(this.worldId)}/articles/search`,
        { searchParams: params },
      );
      return this.#normalizeArticles(payload?.articles ?? payload);
    } catch (error) {
      console.warn('[boromir] Falling back to mock article results:', error.message);
      return this.#mockArticles(trimmed);
    }
  }

  async #request(path, { method = 'GET', searchParams, body } = {}) {
    const url = new URL(`${BOROMIR_BASE_URL}${path}`);
    if (searchParams) {
      for (const [key, value] of searchParams instanceof URLSearchParams
        ? searchParams.entries()
        : Object.entries(searchParams)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, value);
        }
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Application-Key': this.applicationKey,
          Authorization: `Bearer ${this.authToken}`,
          'X-World-Id': this.worldId,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Boromir API error (${response.status}): ${errorBody}`);
      }

      if (response.status === 204) {
        return null;
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out before the Boromir API responded.');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  #normalizeWorld(payload = {}) {
    return {
      worldId: payload.worldId || payload.id || this.worldId || 'unknown-world',
      title: payload.title || 'World Anvil world',
      description: payload.description || payload.summary || '',
      tags: this.#normalizeTags(payload.tags),
    };
  }

  #normalizeArticles(articles = []) {
    if (!Array.isArray(articles)) {
      return [];
    }

    return articles.map((article, index) => {
      const slug = article.slug || article.urlSlug;
      return {
        id: article.id || article.articleId || `article-${index + 1}`,
        title: article.title || 'Untitled article',
        url:
          article.url ||
          (slug && this.worldId
            ? `https://www.worldanvil.com/w/${this.worldId}/a/${slug}`
            : ''),
        excerpt: article.excerpt || article.summary || article.preview || '',
      };
    });
  }

  #normalizeTags(tags) {
    if (Array.isArray(tags)) {
      return tags.map((tag) => String(tag));
    }
    if (typeof tags === 'string') {
      return tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
    }
    return [];
  }

  #mockWorldMetadata() {
    return {
      worldId: this.worldId || 'unknown-world',
      title: 'World Anvil Lore Assistant (sample world)',
      description:
        'A placeholder world used to bootstrap the Lore Assistant before real API wiring is added.',
      tags: ['prototype', 'bootstrap'],
    };
  }

  #mockArticles(query) {
    const sanitizedQuery = query.trim().slice(0, 80);
    return [
      {
        id: 'sample-article-1',
        title: 'Getting started with the Boromir API',
        url: 'https://www.worldanvil.com/w/sample-world/boromir-api',
        excerpt: `Overview article automatically generated for: ${sanitizedQuery}`,
      },
      {
        id: 'sample-article-2',
        title: 'Integrating AI reasoning',
        url: 'https://www.worldanvil.com/w/sample-world/ai-reasoning',
        excerpt: 'Explains how WALA grounds its answers in actual world content.',
      },
    ];
  }

  #hasCredentials() {
    return Boolean(this.applicationKey && this.authToken && this.worldId);
  }
}
