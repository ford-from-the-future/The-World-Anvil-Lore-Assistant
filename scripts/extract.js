import fs from 'node:fs';
import path from 'node:path';

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

function writeExtract(slug, field, text) {
  const outDir = path.resolve(process.cwd(), 'data', 'extract');
  ensureDir(outDir);
  const safe = slug.replace(/[^a-zA-Z0-9-_\.]/g, '-');
  const fname = `${safe}_${field}.txt`;
  const fp = path.join(outDir, fname);
  fs.writeFileSync(fp, (text || '').toString(), 'utf8');
  return fp;
}

async function run() {
  const fileOrDir = process.argv[2];
  if (!fileOrDir) { console.error('Usage: node scripts/extract.js <path-to-article-json-or-folder>'); process.exit(1); }
  const stat = fs.statSync(fileOrDir);
  const files = stat.isDirectory() ? fs.readdirSync(fileOrDir).map((f) => path.join(fileOrDir, f)) : [fileOrDir];

  const fields = (process.argv[3] || 'content,sidepanelcontenttop,sidepanelcontent,sidebarcontentbottom,footnotes,fullfooter,displayCss').split(',').map(s=>s.trim());

  for (const f of files) {
    if (!fs.existsSync(f)) continue;
    try {
      const raw = fs.readFileSync(f, 'utf8');
      const json = JSON.parse(raw);
      const slug = json.slug || json.id || path.basename(f, path.extname(f));
      for (const field of fields) {
        const val = json[field] || json.raw?.[field] || json.raw?.[field] || null;
        if (val) {
          const out = writeExtract(slug, field, val);
          console.log('Wrote', out);
        }
      }
    } catch (e) {
      console.error('Failed to extract from', f, e.message);
    }
  }
}

run().catch((e) => { console.error('Extract failed:', e); process.exit(1); });
