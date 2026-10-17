require('../test-support/helpers');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// The cookie policy page (frontend) must keep describing what the backend really sets.
const read = (p) => fs.readFileSync(path.join(__dirname, p), 'utf8');
const auth = read('../src/controllers/authController.js');
const env = read('../src/config/env.js');
const policy = read('../../frontend/src/pages/public/legalContent.js');

test('cookie policy matches the real refresh-cookie settings', () => {
  const name = auth.match(/REFRESH_COOKIE_NAME\s*=\s*'([^']+)'/)[1];
  const opts = auth.match(/refreshCookieOptions\s*=\s*\{([\s\S]*?)\};/)[1];
  assert.match(opts, /httpOnly:\s*true/, 'policy says HTTP-only');
  assert.match(opts, /secure:\s*env\.nodeEnv === 'production'/, 'policy says Secure in production');
  const sameSite = opts.match(/sameSite:\s*'(\w+)'/)[1];
  const cookiePath = opts.match(/path:\s*'([^']+)'/)[1];
  assert.ok(policy.includes(`Name: ${name}.`), `policy must name the cookie "${name}"`);
  assert.ok(policy.toLowerCase().includes(`samesite=${sameSite}`), `policy must state SameSite=${sameSite}`);
  assert.ok(policy.includes(cookiePath), `policy must state the cookie path ${cookiePath}`);
  const days = Number(env.match(/JWT_REFRESH_EXPIRES_MS \|\| (\d+)/)[1]) / 86400000;
  assert.ok(policy.includes(`${days} days`), `policy must state the default lifetime (${days} days)`);
});

test('policy statements about storage stay true: access token in memory, theme in local storage', () => {
  const front = (p) => fs.readFileSync(path.join(__dirname, '../../frontend/src', p), 'utf8');
  assert.ok(!/localStorage\.setItem\([^)]*(token|access)/i.test(front('context/AuthContext.jsx') + front('api/axiosInstance.js')), 'tokens must not be written to storage');
  assert.match(front('context/ThemeContext.jsx'), /localStorage\.setItem\('theme'/);
});
