require('../test-support/helpers');
const test = require('node:test');
const assert = require('node:assert/strict');
const errorHandler = require('../src/middleware/errorHandler');
const ApiError = require('../src/utils/ApiError');

const run = (err) => {
  const res = { statusCode: 0, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
  errorHandler(err, { requestId: 'req-12345678', method: 'GET', originalUrl: '/x?token=secret' }, res, () => {});
  return res;
};

test('unexpected errors never leak internal messages outside development', () => {
  const res = run(new Error('E11000 connection string mongodb://user:pw@host failed'));
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.message, 'Internal Server Error');
  assert.equal(res.body.stack, undefined);
  assert.equal(res.body.requestId, 'req-12345678');
});

test('ApiError keeps its intentional public message and status', () => {
  const res = run(new ApiError(403, 'Access denied'));
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, 'Access denied');
});

test('CastError does not echo the client-supplied value', () => {
  const err = Object.assign(new Error('cast'), { name: 'CastError', path: '_id', value: '<script>alert(1)</script>' });
  const res = run(err);
  assert.equal(res.statusCode, 400);
  assert.ok(!JSON.stringify(res.body).includes('<script>'));
});

test('duplicate-key errors map to 409 without crashing on missing keyValue', () => {
  assert.equal(run(Object.assign(new Error('dup'), { code: 11000 })).statusCode, 409);
  assert.equal(run(Object.assign(new Error('dup'), { code: 11000, keyValue: { email: 'a@b.c' } })).body.errors[0].field, 'email');
});

test('JWT errors map to 401', () => {
  assert.equal(run(Object.assign(new Error('x'), { name: 'JsonWebTokenError' })).statusCode, 401);
  assert.equal(run(Object.assign(new Error('x'), { name: 'TokenExpiredError' })).statusCode, 401);
});
