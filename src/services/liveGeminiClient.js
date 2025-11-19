export class LiveGeminiClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async generateResponse(question, context) {
    if (!this.apiKey) {
      throw new Error('GOOGLE_GEMINI_API_KEY is required for live Gemini requests');
    }

    const promptParts = [];
    if (context?.world) {
      promptParts.push(`World: ${context.world.title}\nDescription: ${context.world.description}`);
    }
    if (context?.articles && context.articles.length) {
      promptParts.push('Referenced articles:');
      for (const a of context.articles.slice(0, 5)) {
        promptParts.push(`- ${a.title}: ${a.url}`);
      }
    }
    promptParts.push(`Question: ${question}`);
    const prompt = promptParts.join('\n\n');
    // Try several known endpoint/model combinations used by Google's
    // Generative Language API. Stop at the first that returns a usable
    // text output.
    const candidates = [
      {
        url: `https://generativelanguage.googleapis.com/v1/models/text-bison-001:generateText?key=${encodeURIComponent(
          this.apiKey
        )}`,
        body: { prompt: { text: prompt }, temperature: 0.2, maxOutputTokens: 512 },
        extract: (data) => data?.candidates?.[0]?.output || data?.candidates?.[0]?.content || data?.output || data?.candidates?.[0]?.text,
      },
      {
        url: `https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generateText?key=${encodeURIComponent(
          this.apiKey
        )}`,
        body: { prompt: { text: prompt }, temperature: 0.2, maxOutputTokens: 512 },
        extract: (data) => data?.candidates?.[0]?.output || data?.candidates?.[0]?.content || data?.output || data?.candidates?.[0]?.text,
      },
      // Chat-style model (different request shape)
      {
        url: `https://generativelanguage.googleapis.com/v1/models/chat-bison-001:generateMessage?key=${encodeURIComponent(
          this.apiKey
        )}`,
        body: {
          message: { content: [{ type: 'text', text: prompt }] },
          temperature: 0.2,
        },
        extract: (data) => data?.candidates?.[0]?.content || (Array.isArray(data?.output) ? data.output.map((o) => o.content).join('\n') : undefined),
      },
    ];

    let lastErr = null;
    for (const candidate of candidates) {
      try {
        const res = await fetch(candidate.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(candidate.body),
        });
        const data = await res.json().catch(() => ({}));
        const extracted = candidate.extract(data);
        if (res.ok && extracted) {
          const outputText = typeof extracted === 'string' ? extracted : JSON.stringify(extracted);
          return {
            summary: outputText,
            references: (context.articles || []).map((a) => ({ id: a.id, title: a.title, url: a.url })),
          };
        }

        // If the API returned an error body, remember it and try next candidate
        lastErr = { status: res.status, body: data };
      } catch (err) {
        lastErr = err;
      }
    }

    // No candidate succeeded — return a helpful diagnostic in the summary.
    return {
      summary: `Generated response (raw): ${JSON.stringify(lastErr).slice(0, 1000)}`,
      references: (context.articles || []).map((a) => ({ id: a.id, title: a.title, url: a.url })),
    };
  }
}
