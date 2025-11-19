import fs from 'node:fs';
import path from 'node:path';
import { config as appConfig } from '../src/config/env.js';
import { LiveBoromirClient } from '../src/services/liveBoromirClient.js';

function simpleXmlParseItems(xml) {
  const items = [];
  const itemRe = /<item[\s\S]*?>[\s\S]*?<\/item>/gi;
  const matches = xml.match(itemRe) || [];
  for (const m of matches) {
    const link = (m.match(/<link>([\s\S]*?)<\/link>/i) || [])[1] || null;
    const guid = (m.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i) || [])[1] || null;
    const title = (m.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || null;
    items.push({ link: (link || guid || '').trim(), guid: (guid||'').trim(), title: (title||'').trim() });
  }
  return items;
}

function extractSlugFromLink(link) {
  if (!link) return null;
  try {
    const url = new URL(link);
    const parts = url.pathname.split('/').filter(Boolean);
    const aIndex = parts.indexOf('a');
    if (aIndex >= 0 && parts[aIndex+1]) return parts[aIndex+1];
    return parts[parts.length-1] || null;
  } catch (e) {
    return null;
  }
}

function formatDateForFilename(dateStr) {
  if (!dateStr) return null;
  // Expecting 'YYYY-MM-DD HH:MM:SS.ffffff' or ISO; normalize
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

async function run() {
  const feedArg = process.argv[2] || appConfig.rssUrl;
  if (!feedArg) {
    console.error('Provide RSS URL as argv or set WALA_RSS_URL in .env');
    process.exit(1);
  }

  const limitArg = Number(process.argv.includes('--limit') ? process.argv[process.argv.indexOf('--limit')+1] : process.env.WALA_RSS_LIMIT || 50);
  const limit = Number.isFinite(limitArg) ? limitArg : 50;
  const appendLastModif = (process.env.WALA_RSS_APPEND_LAST_MODIF || 'true').toLowerCase() === 'true';
  const overwriteThreshold = Number(process.env.WALA_OVERWRITE_THRESHOLD || 75);

  console.log('Fetching RSS feed:', feedArg);
  const res = await fetch(feedArg, { headers: { 'User-Agent': 'WALA-backup' } });
  if (!res.ok) { console.error('Failed to fetch feed:', res.statusText); process.exit(1); }
  const text = await res.text();
  const items = simpleXmlParseItems(text);
  console.log(`Found ${items.length} item(s) in the feed`);

  const client = new LiveBoromirClient({ applicationKey: appConfig.applicationKey, authToken: appConfig.authToken, worldId: appConfig.worldId });

  const outDir = path.resolve(process.cwd(), 'data', 'articles');
  fs.mkdirSync(outDir, { recursive: true });

  let count = 0;
  for (const it of items) {
    if (count >= limit) break;
    const slug = extractSlugFromLink(it.link) || it.guid || it.title;
    if (!slug) continue;
    console.log('\nFetching article for:', it.title || slug);
    const art = await client.fetchArticle(slug, 2);
    if (!art) { console.log('  not found'); continue; }

    const lastMod = art.raw?.updateDate?.date || art.raw?.publicationDate?.date || new Date().toISOString();
    const modTag = appendLastModif ? `-${formatDateForFilename(lastMod) || Date.now()}` : '';
    const safeSlug = (art.slug || art.id || slug).replace(/[^a-zA-Z0-9-_\.]/g, '-');
    const filename = `${safeSlug}${modTag}.json`;
    const filePath = path.join(outDir, filename);

    const data = JSON.stringify(art.raw || art, null, 2);
    let write = true;
    if (fs.existsSync(filePath)) {
      const prev = fs.readFileSync(filePath, 'utf8');
      const prevSize = Buffer.byteLength(prev, 'utf8');
      const newSize = Buffer.byteLength(data, 'utf8');
      if (prevSize > 0 && newSize / prevSize * 100 < overwriteThreshold) {
        console.log('  new file is smaller than threshold; skipping overwrite');
        write = false;
      }
    }

    if (write) {
      fs.writeFileSync(filePath, data, 'utf8');
      console.log('  saved to', filePath);
      count += 1;
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  console.log('\nBackup complete. Saved', count, 'articles into', outDir);
}

run().catch((e) => { console.error('Backup failed:', e); process.exit(1); });
