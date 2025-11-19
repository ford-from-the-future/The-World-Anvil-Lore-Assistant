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
    'User-Agent': 'WALA-diag (world-explore)',
  };
  if (appConfig.applicationKey) headers['x-application-key'] = appConfig.applicationKey;
  if (appConfig.authToken) headers['x-auth-token'] = appConfig.authToken;
  return headers;
}

function findCandidateArrays(obj, path = '') {
  const found = [];
  if (Array.isArray(obj) && obj.length > 0 && typeof obj[0] === 'object') {
    const keys = Object.keys(obj[0]);
    if (keys.includes('id') || keys.includes('title') || keys.includes('slug') || keys.includes('name')) {
      found.push({ path, sample: obj.slice(0, 5) });
    }
  }
  if (obj && typeof obj === 'object') {
    for (const k of Object.keys(obj)) {
      try {
        const child = obj[k];
        const childPath = path ? `${path}.${k}` : k;
        found.push(...findCandidateArrays(child, childPath));
      } catch (e) {
        // ignore
      }
    }
  }
  return found;
}

async function run() {
  if (!appConfig.worldId) {
    console.error('Missing WALA_WORLD_ID in config');
    process.exit(1);
  }

  const base = 'https://www.worldanvil.com/api/external/boromir';
  const worldId = encodeURIComponent(appConfig.worldId);
  const headers = buildHeaders();
  const url = `${base}/world?id=${worldId}&granularity=2`;

  console.log('Fetching world JSON from:', url);
  const res = await tryFetch(url, { method: 'GET', headers });
  if (res.error) { console.error('Fetch error:', res.error); return; }
  if (!res.json) { console.log('No JSON returned, preview text:', (res.text || '').slice(0, 2000)); return; }

  const world = res.json;
  console.log('World title:', world.title || world.name || '(unknown)');
  console.log('Counts: articles=', world.countArticles, 'timelines=', world.countTimelines, 'maps=', world.countMaps);

  const candidates = findCandidateArrays(world);
  if (candidates.length === 0) {
    console.log('No obvious article-like arrays found in world JSON.');
    return;
  }

  console.log('\nFound candidate arrays that may contain articles/objects:');
  for (const c of candidates) {
    console.log('- path:', c.path);
    console.log('  sample items:');
    for (const s of c.sample) {
      const id = s.id || s._id || s.slug || s.name || s.title || s.url || null;
      const title = s.title || s.name || s.heading || null;
      console.log('   - id:', id, ' title:', title);
    }
  }
}

run().catch((e) => { console.error('Diag failed:', e); process.exit(1); });
