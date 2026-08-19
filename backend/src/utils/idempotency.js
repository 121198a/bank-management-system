const crypto = require('crypto');
const IdempotencyKey = require('../models/IdempotencyKey');
const ApiError = require('./ApiError');

const stableStringify = (value) => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
};

const requestHash = (operation, body) => crypto.createHash('sha256').update(`${operation}:${stableStringify(body)}`).digest('hex');

const requireIdempotencyKey = (req) => {
  const key = String(req.get('Idempotency-Key') || '').trim();
  if (!/^[A-Za-z0-9._:-]{16,128}$/.test(key)) throw new ApiError(400, 'A valid Idempotency-Key header (16-128 characters) is required');
  return key;
};

const createIdempotencyRecord = async (payload, session) => {
  if (session) return (await IdempotencyKey.create([payload], { session }))[0];
  return IdempotencyKey.create(payload);
};

const beginIdempotentOperation = async ({ req, actorId, operation, session }) => {
  const key = requireIdempotencyKey(req);
  const hash = requestHash(operation, req.body);
  const payload = { actor: actorId, key, operation, requestHash: hash, status: 'pending' };

  try {
    return { record: await createIdempotencyRecord(payload, session), replay: false };
  } catch (err) {
    if (err.code !== 11000) throw err;
    const query = IdempotencyKey.findOne({ actor: actorId, key });
    if (session) query.session(session);
    const existing = await query;
    if (!existing) throw err;
    if (existing.operation !== operation || existing.requestHash !== hash) throw new ApiError(409, 'Idempotency-Key was already used for a different request');
    if (existing.status === 'completed') return { record: existing, replay: true };
    throw new ApiError(409, 'A request with this Idempotency-Key is already in progress');
  }
};

const completeIdempotentOperation = async ({ record, statusCode, response, session }) => {
  record.status = 'completed';
  record.statusCode = statusCode;
  record.response = response;
  if (session) await record.save({ session });
  else await record.save();
};

module.exports = { requireIdempotencyKey, beginIdempotentOperation, completeIdempotentOperation, requestHash };
