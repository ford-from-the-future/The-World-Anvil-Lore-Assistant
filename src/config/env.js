import fs from 'node:fs';
import path from 'node:path';

const ENV_PATH = path.resolve(process.cwd(), '.env');

function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }

  const [rawKey, ...rest] = trimmed.split('=');
  const key = rawKey.trim();
  const value = rest.join('=').trim();
  return { key, value };
}

function loadEnvFile() {
  if (!fs.existsSync(ENV_PATH)) {
    return {};
  }

  const entries = {};
  const fileContents = fs.readFileSync(ENV_PATH, 'utf8');

  for (const line of fileContents.split(/\r?\n/)) {
    const parsed = parseLine(line);
    if (parsed) {
      entries[parsed.key] = parsed.value;
    }
  }

  return entries;
}

const envFromFile = loadEnvFile();

for (const [key, value] of Object.entries(envFromFile)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}

const serverConfig = {
  applicationKey: process.env.WALA_APPLICATION_KEY || '',
  authToken: process.env.WALA_AUTH_TOKEN || '',
  worldId: process.env.WALA_WORLD_ID || '',
  worldUrl: process.env.WALA_WORLD_URL || '',
  rssUrl: process.env.WALA_RSS_URL || '',
  geminiApiKey: process.env.GOOGLE_GEMINI_API_KEY || '',
  widgetApiBase: process.env.WALA_WIDGET_API_BASE || '/api/wala',
  widgetAllowedOrigin: process.env.WALA_WIDGET_ALLOWED_ORIGIN || '',
};

export const publicConfig = {
  worldId: serverConfig.worldId,
  worldUrl: serverConfig.worldUrl,
  widgetApiBase: serverConfig.widgetApiBase,
};

export function buildServerConfig(overrides = {}) {
  return {
    ...serverConfig,
    ...overrides,
  };
}

export const config = buildServerConfig();

export function validateConfig() {
  const missing = Object.entries({
    WALA_APPLICATION_KEY: serverConfig.applicationKey,
    WALA_AUTH_TOKEN: serverConfig.authToken,
    WALA_WORLD_ID: serverConfig.worldId,
    GOOGLE_GEMINI_API_KEY: serverConfig.geminiApiKey,
  })
    .filter(([, value]) => !value)
    .map(([key]) => key);

  return missing;
}
