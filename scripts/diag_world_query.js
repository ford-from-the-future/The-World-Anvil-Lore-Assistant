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
  if (!appConfig.worldId) {
    console.error('Missing WALA_WORLD_ID in config');
    process.exit(1);
  }

  const base = 'https://www.worldanvil.com/api/external/boromir';
  const url = `${base}/world?id=${encodeURIComponent(appConfig.worldId)}&granularity=1`;

  console.log('Request URL:', url);

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'User-Agent': 'WALA-diag (world query endpoint)',
  };
  if (appConfig.applicationKey) headers['x-application-key'] = appConfig.applicationKey;
  if (appConfig.authToken) headers['x-auth-token'] = appConfig.authToken;

  const result = await tryFetch(url, { method: 'GET', headers });

  console.log('\n== Response ==\n');
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
