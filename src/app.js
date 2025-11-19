import { BoromirClient } from './services/boromirClient.js';
import { GeminiClient } from './services/geminiClient.js';

export class LoreAssistant {
  constructor(appConfig) {
    this.config = appConfig;
    this.boromirClient = new BoromirClient(appConfig);
    this.geminiClient = new GeminiClient(appConfig.geminiApiKey);
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
