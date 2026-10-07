const crypto = require('crypto');

/**
 * Field-level encryption for sensitive identifiers (KYC document numbers).
 *
 *  - AES-256-GCM, random 96-bit IV per value, authenticated (tampering is detected).
 *  - Stored format: "enc:v1:<iv>:<tag>:<ciphertext>" (base64url). Anything without the
 *    prefix is treated as legacy plaintext so rollout needs no big-bang migration.
 *  - blindIndex(): keyed HMAC of the normalised value, used for exact-match lookups
 *    without storing the plaintext. A separate sub-key is derived with HKDF.
 *  - Key: KYC_ENCRYPTION_KEY = 32 bytes as 64 hex chars or base64. If unset, values are
 *    stored unencrypted (legacy behaviour) — see isEnabled().
 */
const PREFIX = 'enc:v1:';

const parseKey = (raw) => {
  if (!raw) return null;
  const value = String(raw).trim();
  const buf = /^[0-9a-fA-F]{64}$/.test(value) ? Buffer.from(value, 'hex') : Buffer.from(value, 'base64');
  if (buf.length !== 32) throw new Error('KYC_ENCRYPTION_KEY must be 32 bytes (64 hex characters or base64)');
  return buf;
};

const getKeys = (rawKey = process.env.KYC_ENCRYPTION_KEY) => {
  const master = parseKey(rawKey);
  if (!master) return null;
  const derive = (info) => Buffer.from(crypto.hkdfSync('sha256', master, Buffer.alloc(0), info, 32));
  return { enc: derive('field-encryption-v1'), index: derive('blind-index-v1') };
};

const isEnabled = (rawKey) => Boolean(getKeys(rawKey));
const isEncrypted = (value) => typeof value === 'string' && value.startsWith(PREFIX);

const encrypt = (plain, rawKey) => {
  if (plain === undefined || plain === null || plain === '') return plain;
  const keys = getKeys(rawKey);
  if (!keys) return plain;
  if (isEncrypted(plain)) return plain;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keys.enc, iv);
  const ct = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${[iv, tag, ct].map((b) => b.toString('base64url')).join(':')}`;
};

const decrypt = (stored, rawKey) => {
  if (!isEncrypted(stored)) return stored; // legacy plaintext or empty
  const keys = getKeys(rawKey);
  if (!keys) throw new Error('Encrypted value found but KYC_ENCRYPTION_KEY is not configured');
  const [iv, tag, ct] = stored.slice(PREFIX.length).split(':').map((p) => Buffer.from(p, 'base64url'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', keys.enc, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
};

const normalise = (value) => String(value).trim().replace(/[\s-]+/g, '').toUpperCase();

const blindIndex = (plain, rawKey) => {
  const keys = getKeys(rawKey);
  if (!keys || plain === undefined || plain === null || plain === '') return undefined;
  return crypto.createHmac('sha256', keys.index).update(normalise(plain)).digest('hex');
};

const last4 = (plain) => {
  const n = normalise(plain || '');
  return n ? n.slice(-4) : '';
};

module.exports = { encrypt, decrypt, blindIndex, last4, isEnabled, isEncrypted, PREFIX };
