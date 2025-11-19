/**
 * Minimal Boromir API client. The real API integration can reuse this skeleton
 * to attach HTTP requests. For now we focus on predictable, offline-friendly
 * sample data so the rest of the app can be developed incrementally.
 */
export class BoromirClient {
  constructor({ applicationKey, authToken, worldId }) {
    this.applicationKey = applicationKey;
    this.authToken = authToken;
    this.worldId = worldId;
  }

  get headers() {
    return {
      'X-Application-Key': this.applicationKey || 'missing-application-key',
      Authorization: this.authToken ? `Bearer ${this.authToken}` : 'Bearer missing-token',
    };
  }

  /**
   * @returns {Promise<import('../types/models.js').WorldMetadata>}
   */
  async fetchWorldMetadata() {
    // Placeholder payload that mirrors the shape of a real response.
    return {
      worldId: this.worldId || 'unknown-world',
      title: 'World Anvil Lore Assistant (sample world)',
      description:
        'A placeholder world used to bootstrap the Lore Assistant before real API wiring is added.',
      tags: ['prototype', 'bootstrap'],
    };
  }

  /**
   * @param {string} query
   * @returns {Promise<import('../types/models.js').ArticleSummary[]>}
   */
  async searchArticles(query) {
    if (!query) {
      return [];
    }

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
}
