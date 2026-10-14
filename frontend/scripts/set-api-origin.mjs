// node scripts/set-api-origin.mjs https://your-backend.example.com
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildVercelConfig } from './lib/vercelConfig.mjs';

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '../vercel.json');
try {
  const next = buildVercelConfig(JSON.parse(fs.readFileSync(file, 'utf8')), process.argv[2]);
  fs.writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`vercel.json now proxies /api/* to ${next.rewrites[0].destination.replace('/api/:path*', '')}`);
} catch (err) {
  console.error(`Not changed: ${err.message}`);
  process.exit(1);
}
