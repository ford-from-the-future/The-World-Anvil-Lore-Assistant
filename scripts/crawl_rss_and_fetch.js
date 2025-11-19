import { config as appConfig } from '../src/config/env.js';
import { LiveBoromirClient } from '../src/services/liveBoromirClient.js';

function simpleXmlParseItems(xml) {
  // Very small RSS <item> extractor: not a full XML parser but good
  // enough for typical RSS feeds (extracts <item> blocks and common
  // fields: link, guid, title).
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
    // worldanvil article urls often contain '/a/<slug>' or end with slug
    const aIndex = parts.indexOf('a');
    if (aIndex >= 0 && parts[aIndex+1]) return parts[aIndex+1];
    // else return last path segment
    return parts[parts.length-1] || null;
  } catch (e) {
    return null;
  }
}

async function run() {
  const feedArg = process.argv[2] || appConfig.rssUrl;
  if (!feedArg) {
    console.error('Usage: node scripts/crawl_rss_and_fetch.js <rss-url> (or set WALA_RSS_URL in .env)');
    process.exit(1);
  }

  console.log('Fetching RSS feed:', feedArg);
  const res = await fetch(feedArg, { headers: { 'User-Agent': 'WALA-diag (rss-crawler)' } });
  if (!res.ok) {
    console.error('Failed to fetch feed:', res.status, res.statusText);
    process.exit(1);
  }
  const text = await res.text();
  const items = simpleXmlParseItems(text);
  console.log(`Found ${items.length} item(s) in the feed`);

  const client = new LiveBoromirClient({ applicationKey: appConfig.applicationKey, authToken: appConfig.authToken, worldId: appConfig.worldId });

  const results = [];
  for (const it of items) {
    const slug = extractSlugFromLink(it.link) || it.guid || it.title;
    console.log('\n-> item:', it.title || slug);
    console.log('   link:', it.link || '(none)');
    if (!slug) { console.log('   no slug/guid/title to use for fetch, skipping'); continue; }

    try {
      const art = await client.fetchArticle(slug, 2);
      if (art) {
        console.log('   fetched:', art.id, 'title:', art.title);
        results.push({ id: art.id, title: art.title, url: art.url });
      } else {
        console.log('   article fetch returned null (not found)');
      }
    } catch (e) {
      console.log('   fetch error:', String(e));
    }

    // be gentle
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log('\nDone. Found', results.length, 'articles:');
  for (const r of results) console.log('-', r.id, r.title, r.url);
}

run().catch((e) => { console.error('Failed:', e); process.exit(1); });
