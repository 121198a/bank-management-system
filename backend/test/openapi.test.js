require('../test-support/helpers');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const SwaggerParser = require('@apidevtools/swagger-parser');
const { collectRoutes } = require('../scripts/list-routes');
const { buildOpenApi } = require('../scripts/lib/openapi');
const { depositValidator } = require('../src/validators/transactionValidators');
const { normalizeMoneyString } = require('../src/utils/money');

const routes = collectRoutes();
const spec = buildOpenApi(routes);
const opsOf = (s) => Object.entries(s.paths).flatMap(([p, item]) => Object.entries(item).map(([m, op]) => ({ p, m, op })));

test('generated document is valid OpenAPI 3.0', async () => {
  const api = await SwaggerParser.validate(JSON.parse(JSON.stringify(spec)));
  assert.equal(api.openapi, '3.0.3');
});

test('every real route is documented exactly once', () => {
  assert.equal(opsOf(spec).length, routes.length);
  const ids = opsOf(spec).map((o) => o.op.operationId);
  assert.equal(new Set(ids).size, ids.length, 'operationIds must be unique');
});

test('security requirements mirror the real guards', () => {
  const byKey = new Map(routes.map((r) => [`${r.method.toLowerCase()} ${r.path.replace(/:([A-Za-z0-9_]+)/g, '{$1}')}`, r]));
  for (const { p, m, op } of opsOf(spec)) {
    const r = byKey.get(`${m} ${p}`);
    assert.ok(r, `${m} ${p} has no matching route`);
    if (r.auth === 'JWT') assert.deepEqual(op.security, [{ bearerAuth: [] }], `${m} ${p}`);
    else assert.deepEqual(op.security, [], `${m} ${p} must be explicitly public`);
  }
});

test('money-moving endpoints document the required Idempotency-Key header', () => {
  for (const k of ['deposit', 'withdraw', 'transfer']) {
    const params = spec.paths[`/api/transactions/${k}`].post.parameters;
    const h = params.find((x) => x.name === 'Idempotency-Key');
    assert.ok(h && h.required && h.in === 'header', k);
  }
});

test('amount schema agrees with what the API really accepts: validator AND money parser (no drift)', async () => {
  const pattern = new RegExp(spec.paths['/api/transactions/deposit'].post.requestBody.content['application/json'].schema.properties.amount.pattern);
  const { validationResult } = require('express-validator');
  const validatorAccepts = async (amount) => {
    const req = { body: { accountId: '507f1f77bcf86cd799439011', amount }, query: {}, params: {}, headers: {}, cookies: {} };
    for (const chain of depositValidator) await chain.run(req);
    return !validationResult(req).array().some((e) => e.path === 'amount' && /decimal/i.test(e.msg));
  };
  const parserAccepts = (amount) => { try { normalizeMoneyString(amount, { allowZero: true }); return true; } catch { return false; } };
  for (const amount of ['0', '10', '10.5', '10.55', '0.01', '10.555', '10.', '.5', '+5', '007', 'abc', '1e3', '', ' 5']) {
    const effective = (await validatorAccepts(amount)) && parserAccepts(amount);
    assert.equal(pattern.test(amount), effective, `schema/API disagreement for "${amount}"`);
  }
});

test('committed docs/upgrade/openapi.json is up to date (run `npm run docs:openapi`)', () => {
  const file = path.join(__dirname, '../../docs/upgrade/openapi.json');
  const committed = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.deepEqual(committed, JSON.parse(JSON.stringify(spec)), 'API changed but openapi.json was not regenerated');
});
