const crypto = require('crypto');

const requestId = (req, res, next) => {
  const incoming = String(req.get('X-Request-ID') || '').trim();
  const id = /^[A-Za-z0-9._:-]{8,128}$/.test(incoming) ? incoming : crypto.randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-ID', id);
  next();
};

module.exports = requestId;
