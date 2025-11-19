import { config as appConfig } from '../src/config/env.js';

async function tryFetch(url, options = {}) {
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch (e) {
      // not JSON
    }
    return { ok: res.ok, status: res.status, statusText: res.statusText, headers: Object.fromEntries(res.headers.entries()), text, json };
  } catch (err) {
    return { error: String(err) };
  }
}

async function run() {
  const apiKey = appConfig.geminiApiKey || process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Missing GOOGLE_GEMINI_API_KEY in env');
    process.exit(1);
  }

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
  const body = {
    contents: [
      { parts: [{ text: 'Explain how AI works in a few words' }] }
    ]
  };

  console.log('Requesting:', url);

  const result = await tryFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  console.log('\n== Response ==\n');
  if (result.error) {
    console.error('Fetch error:', result.error);
    process.exit(1);
  }

  console.log('ok:', result.ok);
  console.log('status:', result.status, result.statusText);
  console.log('headers:', JSON.stringify(result.headers, null, 2));
  if (result.json) {
    console.log('\njson:', JSON.stringify(result.json, null, 2).slice(0, 8000));
  } else {
    console.log('\ntext:', result.text ? result.text.slice(0, 8000) : '');
  }
}

run().catch((e) => {
  console.error('Diag failed:', e);
  process.exit(1);
});
