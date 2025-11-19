/**
 * Lightweight Gemini client stub. Replace the internals with actual Google
 * Gemini SDK calls once the project is ready for real networking.
 */
export class GeminiClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async generateResponse(question, context) {
    const { world, articles } = context;

    const intro = world
      ? `I looked at ${world.title} (${world.worldId}).`
      : 'No world metadata was available.';

    const articleText = articles && articles.length
      ? `I referenced ${articles.length} article${articles.length === 1 ? '' : 's'}: ${articles
          .map((article) => article.title)
          .join(', ')}.`
      : 'No relevant articles were found, so this is a generic response.';

    return {
      summary: `${intro} ${articleText} Based on that, here is a helpful response to "${question}".`,
      references: (articles || []).map((article) => ({
        id: article.id,
        title: article.title,
        url: article.url,
      })),
    };
  }
}
