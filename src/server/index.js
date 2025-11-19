import path from 'node:path';
import fs from 'node:fs';
import express from 'express';

import { LoreAssistant } from '../app.js';
import { buildServerConfig, publicConfig } from '../config/env.js';

const app = express();
app.use(express.json({ limit: '1mb' }));

const allowedOrigin = process.env.WALA_WIDGET_ALLOWED_ORIGIN || '';

if (allowedOrigin) {
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', allowedOrigin);
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Wala-Auth-Token, X-Wala-Application-Key');
    res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });
}

app.get(`${publicConfig.widgetApiBase}/public-config`, (req, res) => {
  res.json({
    ok: true,
    config: publicConfig,
  });
});

app.post(`${publicConfig.widgetApiBase}/ask`, async (req, res) => {
  const { prompt, articleId } = req.body || {};
  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ ok: false, error: 'A prompt is required.' });
  }

  try {
    const config = buildServerConfig({
      authToken: req.headers['x-wala-auth-token'] || req.headers.authorization?.replace(/Bearer\s+/i, ''),
      applicationKey: req.headers['x-wala-application-key'] || undefined,
    });

    const assistant = new LoreAssistant(config);
    const result = await assistant.answerQuestion(prompt, { articleId: articleId || null });
    res.json({ ok: true, result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message || 'Unexpected server error' });
  }
});

const widgetDist = path.resolve(process.cwd(), 'widget', 'dist');
if (fs.existsSync(widgetDist)) {
  app.use('/widget', express.static(widgetDist));
}

const port = process.env.PORT || 8788;
app.listen(port, () => {
  console.log(`[wala] widget server listening on http://localhost:${port}`);
});
