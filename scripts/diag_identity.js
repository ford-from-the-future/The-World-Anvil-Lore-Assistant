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
  const base = 'https://www.worldanvil.com/api/external/boromir';
  const endpoint = `${base}/identity`;

  console.log('Using applicationKey:', Boolean(appConfig.applicationKey));
  console.log('Using authToken:', Boolean(appConfig.authToken));

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'User-Agent': 'WALA-diag (local)',
  };

  if (appConfig.applicationKey) headers['x-application-key'] = appConfig.applicationKey;
  if (appConfig.authToken) headers['x-auth-token'] = appConfig.authToken;

  console.log('\n== Header-based request ==');
  const headerResult = await tryFetch(endpoint, { method: 'GET', headers });
  console.log(JSON.stringify(headerResult, null, 2).slice(0, 2000));

  const qp = (u) => {
    const ak = encodeURIComponent(appConfig.applicationKey || '');
    const at = encodeURIComponent(appConfig.authToken || '');
    if (ak && at) return `${u}${u.includes('?') ? '&' : '?'}x-application-key=${ak}&x-auth-token=${at}`;
    return u;
  };

  console.log('\n== Query-param request ==');
  const qpUrl = qp(endpoint);
  const qpResult = await tryFetch(qpUrl, { method: 'GET', headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': 'WALA-diag (local)' } });
  console.log(JSON.stringify(qpResult, null, 2).slice(0, 2000));

  console.log('\nDone.');
}

run().catch((e) => {
  console.error('Diag script failed:', e);
  process.exit(1);
});
