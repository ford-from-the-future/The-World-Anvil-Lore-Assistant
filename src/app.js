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

    const aiResponse = await this.geminiClient.generateResponse(question, { world, articles });

    return {
      question,
      world,
      articles,
      aiResponse,
      generatedAt: new Date().toISOString(),
    };
  }
}
