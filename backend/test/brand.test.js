process.env.SMTP_FROM = ''; // ignore any local .env value: this test checks the built-in default
require('../test-support/helpers');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const brand = require('../src/config/brand');

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  return e.isDirectory() ? walk(p) : [p];
});

test('no backend source hard-codes the product name (change it in src/config/brand.js only)', () => {
  const roots = [path.join(__dirname, '../src'), path.join(__dirname, '../scripts')];
  const offenders = roots.flatMap(walk)
    .filter((f) => f.endsWith('.js') && !f.endsWith(path.join('config', 'brand.js')))
    .filter((f) => /NexaBank|Bank Management System/.test(fs.readFileSync(f, 'utf8')));
  assert.deepEqual(offenders.map((f) => path.relative(path.join(__dirname, '..'), f)), []);
});

test('outgoing email subjects and the default sender use the configured name', () => {
  const env = require('../src/config/env');
  assert.ok(env.smtp.from.startsWith(`${brand.name} <`));
  const src = fs.readFileSync(path.join(__dirname, '../src/services/emailService.js'), 'utf8');
  assert.ok(src.includes('${brand.name}'), 'emailService must interpolate brand.name');
});
