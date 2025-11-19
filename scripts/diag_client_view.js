import { config as appConfig } from '../src/config/env.js';

async function tryFetch(url, options = {}) {
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch (e) { /* not json */ }
    return { ok: res.ok, status: res.status, statusText: res.statusText, headers: Object.fromEntries(res.headers.entries()), text, json };
  } catch (err) {
    return { error: String(err) };
  }
}

function buildHeaders() {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'User-Agent': 'WALA-diag (client view)',
  };
  if (appConfig.applicationKey) headers['x-application-key'] = appConfig.applicationKey;
  if (appConfig.authToken) headers['x-auth-token'] = appConfig.authToken;
  return headers;
}

async function run() {
  if (!appConfig.worldId) {
    console.error('Missing WALA_WORLD_ID in config');
    process.exit(1);
  }

  const base = 'https://www.worldanvil.com/api/external/boromir';
  const worldId = encodeURIComponent(appConfig.worldId);
  const headers = buildHeaders();

  const endpoints = [
    // documented world endpoints
    `${base}/world?id=${worldId}&granularity=2`,
    `${base}/world?id=${worldId}&granularity=1`,
    `${base}/world?id=${worldId}`,
    // alternate plural form
    `${base}/worlds/${worldId}?granularity=2`,
    `${base}/worlds/${worldId}?granularity=1`,
    `${base}/worlds/${worldId}`,
    // articles listing
    `${base}/worlds/${worldId}/articles?granularity=2`,
    `${base}/worlds/${worldId}/articles?granularity=1`,
    `${base}/worlds/${worldId}/articles`,
    `${base}/worlds/${worldId}/search?query=&granularity=1`,
  ];

  console.log('Inspecting Boromir endpoints for world:', appConfig.worldId);

  if (appConfig.worldUrl) {
    console.log('\nFound `WALA_WORLD_URL` in config:', appConfig.worldUrl);
    try {
      const web = await tryFetch(appConfig.worldUrl, { method: 'GET', headers: { 'User-Agent': 'WALA-diag (web)', Accept: 'text/html' } });
      if (web.error) {
        console.log('Failed to fetch world URL:', web.error);
      } else {
        console.log('World URL status:', web.status, web.statusText);
        console.log('World URL preview (first 2000 chars):\n', (web.text || '').slice(0, 2000));
      }
    } catch (e) {
      console.log('Error fetching world URL:', String(e));
    }
  }

  for (const url of endpoints) {
    console.log('\n---');
    console.log('Requesting:', url);
    const res = await tryFetch(url, { method: 'GET', headers });
    if (res.error) {
      console.log('Fetch error:', res.error);
      continue;
    }
    console.log('status:', res.status, res.statusText);
    if (res.json) {
      console.log('json keys:', Object.keys(res.json));
      console.log('json (preview):', JSON.stringify(res.json).slice(0, 2000));
    } else {
      console.log('text (preview):', (res.text || '').slice(0, 2000));
    }
  }
}

run().catch((e) => { console.error('Diag failed:', e); process.exit(1); });
