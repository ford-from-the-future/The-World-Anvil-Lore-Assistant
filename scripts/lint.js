#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const projectRoot = process.cwd();

function findJavaScriptFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...findJavaScriptFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

const filesToCheck = findJavaScriptFiles(path.join(projectRoot, 'src'));
filesToCheck.push(path.join(projectRoot, 'scripts', 'lint.js'));

let hasErrors = false;
for (const file of filesToCheck) {
  const result = spawnSync('node', ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) {
    hasErrors = true;
  }
}

if (hasErrors) {
  process.exit(1);
} else {
  console.log(`Linted ${filesToCheck.length} JavaScript files with node --check.`);
}
