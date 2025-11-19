import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import { config, validateConfig } from './config/env.js';
import { LoreAssistant } from './app.js';

async function requestQuestion() {
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question('What would you like to ask your world? ');
  rl.close();
  return answer.trim();
}

function logConfigWarnings() {
  const missing = validateConfig();
  if (missing.length) {
    console.warn('\n[warning] Missing environment values:');
    missing.forEach((key) => console.warn(` - ${key}`));
    console.warn('The assistant will fall back to mock data until credentials are provided.\n');
  }
}

function formatResponse(result) {
  const lines = [];
  lines.push('============================================');
  lines.push(`Question: ${result.question}`);
  lines.push(`Generated: ${result.generatedAt}`);
  lines.push('');
  lines.push('World');
  lines.push(` - Title: ${result.world.title}`);
  lines.push(` - Description: ${result.world.description}`);
  lines.push(` - Tags: ${result.world.tags.join(', ')}`);
  lines.push('');
  lines.push('AI Summary');
  lines.push(` ${result.aiResponse.summary}`);
  lines.push('');
  if (result.aiResponse.references.length) {
    lines.push('References');
    result.aiResponse.references.forEach((ref) => {
      lines.push(` - ${ref.title}: ${ref.url}`);
    });
  }
  lines.push('============================================');
  return lines.join('\n');
}

async function main() {
  logConfigWarnings();

  let question = process.argv.slice(2).join(' ').trim();
  if (!question) {
    question = await requestQuestion();
  }

  if (!question) {
    console.error('No question provided. Exiting.');
    process.exit(1);
  }

  const assistant = new LoreAssistant(config);
  const response = await assistant.answerQuestion(question);
  console.log(formatResponse(response));
}

main().catch((error) => {
  console.error('The Lore Assistant encountered an unexpected error.');
  console.error(error);
  process.exit(1);
});
