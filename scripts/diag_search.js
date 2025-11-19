import { config as appConfig } from '../src/config/env.js';
import { LiveBoromirClient } from '../src/services/liveBoromirClient.js';

async function run() {
  const client = new LiveBoromirClient({ applicationKey: appConfig.applicationKey, authToken: appConfig.authToken, worldId: appConfig.worldId });
  const args = process.argv.slice(2);
  const query = args.slice(0, 1).join(' ') || 'Billy the Hero';
  const categoryId = args[1] || null; // optional second arg
  console.log('Searching for:', query);
  try {
    const results = await client.searchArticles(query, categoryId);
    console.log(`Found ${Array.isArray(results) ? results.length : 0} results:\n`);
    if (Array.isArray(results)) {
      for (const r of results) {
        console.log('- id:', r.id);
        console.log('  title:', r.title);
        console.log('  url :', r.url);
        console.log('  excerpt:', (r.excerpt || '').slice(0, 200));
        console.log('');
      }
    } else {
      console.log(JSON.stringify(results, null, 2));
    }
  } catch (err) {
    console.error('Search failed:', err);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
