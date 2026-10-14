require('../test-support/helpers');
const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('child_process');
const path = require('path');

// env.js reads process.env at load time, so each case runs in a fresh process.
const load = (value) => {
  const env = { ...process.env, NODE_ENV: 'test' };
  if (value === undefined) delete env.TRUST_PROXY; else env.TRUST_PROXY = value;
  const out = execFileSync(process.execPath, ['-e', "console.log(JSON.stringify(require('./src/config/env').trustProxy))"], { cwd: path.join(__dirname, '..'), env });
  return JSON.parse(out.toString());
};

test('TRUST_PROXY: unset/false trusts nobody, true trusts all hops, N trusts exactly N hops', () => {
  assert.equal(load(undefined), false);
  assert.equal(load('false'), false);
  assert.equal(load('true'), true);
  assert.equal(load('2'), 2);
});

test('TRUST_PROXY: nonsense is rejected at startup instead of silently trusting everything', () => {
  for (const bad of ['yes', '0', '-1', '99', '1.5']) {
    assert.throws(() => load(bad), undefined, bad);
  }
});
