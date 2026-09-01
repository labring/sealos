import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const providerRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const statusSource = fs.readFileSync(path.join(providerRoot, 'src/constants/status.ts'), 'utf8');
const statusLabels = [
  ...new Set([...statusSource.matchAll(/label:\s*'([^']+)'/g)].map((match) => match[1]))
];

for (const locale of ['en', 'zh']) {
  const localePath = path.join(providerRoot, `public/locales/${locale}/common.json`);
  const messages = JSON.parse(fs.readFileSync(localePath, 'utf8'));
  const missing = statusLabels.filter((label) => !(label in messages));

  if (missing.length > 0) {
    throw new Error(`${locale} is missing status translations: ${missing.join(', ')}`);
  }
}

console.log(`status translations covered: ${statusLabels.join(', ')}`);
