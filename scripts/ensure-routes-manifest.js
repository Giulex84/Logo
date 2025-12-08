import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const source = join('.next', 'routes-manifest.json');
const target = join('.vercel', 'output', 'routes-manifest.json');

if (!existsSync(source)) {
  console.error(`Expected routes manifest at ${source}, but it was not found.`);
  process.exit(1);
}

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
console.log(`Copied ${source} to ${target}.`);
