const DEFAULT_MODEL = 'gemini-1.5-flash-latest';
const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Thin wrapper around the Google Gemini REST API.
 */
export class GeminiClient {
  constructor({ apiKey, model = DEFAULT_MODEL } = {}) {
    this.apiKey = apiKey;
    this.model = model;
  }

  /**
   * @param {string} question
   * @param {{ world?: import('../types/models.js').WorldMetadata, articles?: import('../types/models.js').ArticleSummary[] }} context
   * @returns {Promise<{ summary: string, references: import('../types/models.js').ArticleSummary[] }>}
   */
  async generateResponse(question, context = {}) {
    if (!this.apiKey) {
      throw new Error('A Google Gemini API key is required.');
    }

    const payload = this.#buildRequestPayload(question, context);
    const url = `${API_BASE_URL}/models/${encodeURIComponent(this.model)}:generateContent?key=${this.apiKey}`;

    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      throw new Error(`Failed to reach the Gemini API: ${error.message}`);
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${body}`);
    }

    const data = await response.json();
    const summary = this.#extractText(data);

    if (!summary) {
      throw new Error('Gemini API returned no text content.');
    }

    return {
      summary,
      references: this.#buildReferences(context.articles),
    };
  }

  #buildRequestPayload(question, context) {
    const prompt = this.#buildPrompt(question, context);

    return {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
    };
  }

  #buildPrompt(question, context) {
    const segments = [`Answer the following question about a World Anvil world.`];

    if (context.world) {
      segments.push(
        `World: ${context.world.title} (${context.world.worldId}). Description: ${context.world.description || 'No description provided.'}`,
      );
    }

    if (context.articles && context.articles.length) {
      const articleSummaries = context.articles
        .map((article, index) => `${index + 1}. ${article.title} — ${article.excerpt || 'No excerpt provided.'}`)
        .join('\n');
      segments.push('Relevant articles:\n' + articleSummaries);
    }

    segments.push('Question: ' + question);
    segments.push('Provide a concise, lore-friendly response grounded in the supplied context.');

    return segments.join('\n\n');
  }

  #extractText(apiResponse) {
    const candidates = apiResponse?.candidates;
    if (!Array.isArray(candidates)) {
      return '';
    }

    for (const candidate of candidates) {
      const text = candidate?.content?.parts?.map((part) => part?.text).filter(Boolean).join('\n').trim();
      if (text) {
        return text;
      }
    }

    return '';
  }

  #buildReferences(articles = []) {
    return articles.map((article) => ({
      id: article.id,
      title: article.title,
      url: article.url,
    }));
  }
}
