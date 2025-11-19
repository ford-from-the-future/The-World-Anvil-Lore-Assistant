import { BoromirClient } from './services/boromirClient.js';
import { GeminiClient } from './services/geminiClient.js';

let LiveBoromirClient = null;
let LiveGeminiClient = null;

if (process.env.WALA_LIVE === 'true') {
  try {
    const mod = await import('./services/liveBoromirClient.js');
    LiveBoromirClient = mod.LiveBoromirClient;
  } catch (err) {
    // best-effort: if live client can't be loaded, we'll fall back to the mock
    console.warn('[warning] Could not load live Boromir client:', err.message || err);
  }

  try {
    const mod = await import('./services/liveGeminiClient.js');
    LiveGeminiClient = mod.LiveGeminiClient;
  } catch (err) {
    console.warn('[warning] Could not load live Gemini client:', err.message || err);
  }
}

export class LoreAssistant {
  constructor(appConfig) {
    this.config = appConfig;
    this.articleCache = new Map();

    if (process.env.WALA_LIVE === 'true' && LiveBoromirClient) {
      this.boromirClient = new LiveBoromirClient(appConfig);
    } else {
      this.boromirClient = new BoromirClient(appConfig);
    }

    if (process.env.WALA_LIVE === 'true' && LiveGeminiClient) {
      this.geminiClient = new LiveGeminiClient(appConfig.geminiApiKey);
    } else {
      this.geminiClient = new GeminiClient(appConfig.geminiApiKey);
    }
  }

  async answerQuestion(question) {
    if (!question || !question.trim()) {
      throw new Error('A question is required.');
    }

    const [world, articles] = await Promise.all([
      this.boromirClient.fetchWorldMetadata(),
      this.boromirClient.searchArticles(question),
    ]);

    // If the Boromir client can fetch full articles, retrieve the top N
    // article bodies to provide real lore context to the model.
    let enrichedArticles = articles;
    const canFetchArticle = typeof this.boromirClient.fetchArticle === 'function';
    if (canFetchArticle && Array.isArray(articles) && articles.length) {
      const top = articles.slice(0, 5);
      const fetches = top.map(async (a) => {
        if (!a || !a.id) return a;
        if (this.articleCache.has(a.id)) return this.articleCache.get(a.id);
        try {
          const full = await this.boromirClient.fetchArticle(a.id, 2);
          const merged = Object.assign({}, a, { full });
          this.articleCache.set(a.id, merged);
          return merged;
        } catch (e) {
          return a;
        }
      });

      const resolved = await Promise.all(fetches);
      // Merge resolved top articles back into the original list (replace by id)
      const byId = Object.fromEntries(resolved.filter(Boolean).map((r) => [r.id || r._id || r.slug || r.url, r]));
      enrichedArticles = articles.map((a) => byId[a.id] || a);
    }

    const aiResponse = await this.geminiClient.generateResponse(question, { world, articles: enrichedArticles });

    return {
      question,
      world,
      articles,
      aiResponse,
      generatedAt: new Date().toISOString(),
    };
  }
}
