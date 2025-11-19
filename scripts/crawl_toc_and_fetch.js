import fs from 'node:fs';
import path from 'node:path';
import { config as appConfig } from '../src/config/env.js';
import { LiveBoromirClient } from '../src/services/liveBoromirClient.js';

function extractLinks(html, baseUrl) {
  const hrefRe = /href\s*=\s*"([^"]+)"/gi;
  const links = new Set();
  let m;
  while ((m = hrefRe.exec(html))) {
    let href = m[1].trim();
    if (!href) continue;
    // Ignore anchors, javascript: and mailto
    if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) continue;
    try {
      const u = new URL(href, baseUrl);
      links.add(u.href);
    } catch (e) {
      // skip invalid
    }
  }
  return Array.from(links);
}

function extractSlugFromLink(link) {
  if (!link) return null;
  try {
    const url = new URL(link);
    const parts = url.pathname.split('/').filter(Boolean);
    const aIndex = parts.indexOf('a');
    if (aIndex >= 0 && parts[aIndex+1]) return parts[aIndex+1];
    // sometimes article path is like /w/world-slug/article-slug
    // return last segment
    return parts[parts.length-1] || null;
  } catch (e) {
    return null;
  }
}

function formatDateForFilename(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  const hh = String(d.getHours()).padStart(2,'0');
  const min = String(d.getMinutes()).padStart(2,'0');
  const ss = String(d.getSeconds()).padStart(2,'0');
  return `${y}-${mm}-${dd}_${hh}${min}${ss}`;
}

async function fetchHtml(url) {
  // Use a more browser-like header set to reduce Cloudflare blocking.
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    Referer: appConfig.worldUrl || undefined,
  };
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return await res.text();
}

async function run() {
  // Find first CLI arg that is not a flag (doesn't start with '-')
  const cliArgs = process.argv.slice(2);
  const firstNonFlag = cliArgs.find((a) => a && !a.startsWith('-'));
  // Only treat it as a URL if it looks like one (starts with http or contains a /)
  const startUrl = (firstNonFlag && (firstNonFlag.startsWith('http') || firstNonFlag.includes('/'))) ? firstNonFlag : appConfig.worldUrl;
  if (!startUrl) { console.error('Set WALA_WORLD_URL in .env or pass as arg'); process.exit(1); }

  const limitArg = Number(process.argv.includes('--limit') ? process.argv[process.argv.indexOf('--limit')+1] : process.env.WALA_CRAWL_LIMIT || 200);
  const limit = Number.isFinite(limitArg) ? limitArg : 200;
  console.log('Starting crawl from', startUrl, 'limit', limit);

  const client = new LiveBoromirClient({ applicationKey: appConfig.applicationKey, authToken: appConfig.authToken, worldId: appConfig.worldId });

  const toVisit = [startUrl];
  const visited = new Set();
  const articleSlugs = new Set();

  while (toVisit.length > 0 && articleSlugs.size < limit) {
    const url = toVisit.shift();
    if (visited.has(url)) continue;
    visited.add(url);
    console.log('\nVisiting:', url);
    let html;
    try {
      html = await fetchHtml(url);
    } catch (e) {
      console.log('  failed to fetch page:', e.message);
      continue;
    }

    const links = extractLinks(html, url);
    for (const l of links) {
      // collect article links that contain '/a/' or end with a slug under world path
      if (l.includes('/a/') || l.includes('/article/') || l.includes('/w/')) {
        const slug = extractSlugFromLink(l);
        if (slug) articleSlugs.add(slug);
      }
      // follow category pages '/c/' to find more article links
      if (l.includes('/c/') && !visited.has(l) && toVisit.length < 500) {
        toVisit.push(l);
      }
    }
  }

  console.log('\nFound', articleSlugs.size, 'candidate slugs (capped at limit).');

  const outDir = path.resolve(process.cwd(), 'data', 'articles');
  fs.mkdirSync(outDir, { recursive: true });

  let saved = 0;
  for (const slug of Array.from(articleSlugs).slice(0, limit)) {
    console.log('\nFetching article slug/id:', slug);
    try {
      const art = await client.fetchArticle(slug, 2);
      if (!art) { console.log('  not found'); continue; }
      const lastMod = art.raw?.updateDate?.date || art.raw?.publicationDate?.date || new Date().toISOString();
      const modTag = `-${formatDateForFilename(lastMod) || Date.now()}`;
      const safeSlug = (art.slug || art.id || slug).replace(/[^a-zA-Z0-9-_\.]/g, '-');
      const filename = `${safeSlug}${modTag}.json`;
      const filePath = path.join(outDir, filename);
      fs.writeFileSync(filePath, JSON.stringify(art.raw || art, null, 2), 'utf8');
      console.log('  saved', filePath);
      saved += 1;
    } catch (e) {
      console.log('  fetch error:', String(e));
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log('\nCrawl complete. Saved', saved, 'articles to', outDir);
}

run().catch((e) => { console.error('Crawl failed:', e); process.exit(1); });
