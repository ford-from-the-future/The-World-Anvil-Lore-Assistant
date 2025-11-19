import { config as appConfig } from '../src/config/env.js';
import { LiveBoromirClient } from '../src/services/liveBoromirClient.js';

async function run() {
  const id = process.argv[2];
  if (!id) {
    console.error('Usage: node scripts/diag_fetch_article.js <article-id>');
    process.exit(1);
  }

  const client = new LiveBoromirClient({ applicationKey: appConfig.applicationKey, authToken: appConfig.authToken, worldId: appConfig.worldId });
  console.log('Fetching article id:', id);
  try {
    const article = await client.fetchArticle(id, 2);
    if (!article) {
      console.log('Article not found or endpoint returned no JSON.');
      process.exit(0);
    }
    console.log('== Article JSON ==');
    console.log(JSON.stringify(article, null, 2).slice(0, 20000));
  } catch (err) {
    console.error('Fetch failed:', err);
    process.exit(1);
  }
}

run().catch((e) => { console.error('Diag failed:', e); process.exit(1); });
