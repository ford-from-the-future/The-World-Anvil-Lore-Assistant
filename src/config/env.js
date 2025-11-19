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

export const config = {
  applicationKey: process.env.WALA_APPLICATION_KEY || '',
  authToken: process.env.WALA_AUTH_TOKEN || '',
  worldId: process.env.WALA_WORLD_ID || '',
  worldUrl: process.env.WALA_WORLD_URL || '',
  rssUrl: process.env.WALA_RSS_URL || '',
  geminiApiKey: process.env.GOOGLE_GEMINI_API_KEY || '',
};

export function validateConfig() {
  const missing = Object.entries({
    WALA_APPLICATION_KEY: config.applicationKey,
    WALA_AUTH_TOKEN: config.authToken,
    WALA_WORLD_ID: config.worldId,
    GOOGLE_GEMINI_API_KEY: config.geminiApiKey,
  })
    .filter(([, value]) => !value)
    .map(([key]) => key);

  return missing;
}
