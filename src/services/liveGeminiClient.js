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
    // Use the Gemini `generateContent` endpoint (gemini-2.0-flash) with the
    // `X-goog-api-key` header. This matches the working diagnostic request.
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    const body = {
      contents: [
        {
          parts: [
            { text: prompt },
          ],
        },
      ],
    };

    const maxAttempts = 3;
    let lastErr = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': this.apiKey,
          },
          body: JSON.stringify(body),
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok && data && Array.isArray(data.candidates) && data.candidates[0]?.content?.parts) {
          const text = data.candidates[0].content.parts.map((p) => p.text).join('\n');
          return { summary: text, references: (context.articles || []).map((a) => ({ id: a.id, title: a.title, url: a.url })) };
        }

        lastErr = { status: res.status, body: data };
        // If it's a transient quota issue (429), retry with backoff. For other
        // statuses we still retry a few times since network flakiness may occur.
      } catch (err) {
        lastErr = err;
      }

      if (attempt < maxAttempts) {
        const backoffMs = 500 * Math.pow(2, attempt - 1);
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    return { summary: `Generated response (raw): ${JSON.stringify(lastErr).slice(0, 1000)}`, references: (context.articles || []).map((a) => ({ id: a.id, title: a.title, url: a.url })) };
  }
}
