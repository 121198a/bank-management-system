/**
 * Builds an OpenAPI 3.0.3 document from the live Express router: paths, methods, auth and
 * role requirements, plus request schemas derived from the express-validator chains that
 * actually guard each route (so the spec cannot drift from the validation code).
 *
 * Limits (stated in the document): response bodies beyond the common envelope are not
 * described, and `custom()` validators are flagged rather than translated.
 */
const brand = require('../../src/config/brand');
const { MONEY_PATTERN } = require('../../src/utils/money');
const MONEY_ROUTES = new Set(['POST /api/transactions/deposit', 'POST /api/transactions/withdraw', 'POST /api/transactions/transfer']);

const toOpenApiPath = (p) => p.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
const camel = (s) => s.replace(/[^A-Za-z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''));

const opt = (item) => (Array.isArray(item.options) ? item.options[0] : undefined);

/** Translate one field's validator stack into a JSON-schema fragment. */
const schemaFromStack = (stack) => {
  const schema = { type: 'string' };
  const notes = [];
  for (const item of stack) {
    if (item.constructor.name === 'CustomValidation') { notes.push('custom validation'); continue; }
    if (item.constructor.name !== 'StandardValidation' || item.negated) continue;
    const name = item.validator && item.validator.name;
    const o = opt(item);
    switch (name) {
      case 'isEmail': schema.format = 'email'; break;
      case 'isMongoId': schema.pattern = '^[0-9a-fA-F]{24}$'; break;
      case 'isInt': schema.type = 'integer'; if (o && o.min !== undefined) schema.minimum = o.min; if (o && o.max !== undefined) schema.maximum = o.max; break;
      case 'isFloat': case 'isNumeric': schema.type = 'number'; if (o && o.min !== undefined) schema.minimum = o.min; if (o && o.max !== undefined) schema.maximum = o.max; break;
      case 'isDecimal': {
        // Every decimal(0,2) field in this API is money; use the canonical pattern the parser enforces.
        schema.type = 'string';
        schema.pattern = MONEY_PATTERN.source;
        schema.description = 'Money amount as a string, at most 2 decimal places, no sign, no leading zeros';
        break;
      }
      case 'isBoolean': schema.type = 'boolean'; break;
      case 'isArray': schema.type = 'array'; schema.items = {}; break;
      case 'isObject': schema.type = 'object'; break;
      case 'isIn': if (Array.isArray(o)) schema.enum = o; break;
      case 'isLength': if (o && o.min !== undefined) schema.minLength = o.min; if (o && o.max !== undefined) schema.maxLength = o.max; break;
      case 'isISO8601': schema.format = 'date-time'; break;
      case 'isURL': schema.format = 'uri'; break;
      case 'matches': if (o instanceof RegExp) schema.pattern = o.source; break;
      case 'isStrongPassword': schema.format = 'password'; break;
      default: break;
    }
  }
  if (notes.length) schema['x-notes'] = [...new Set(notes)];
  return schema;
};

/** Insert a field path like "address.city" or "items.*.id" into an object schema. */
const putField = (root, field, schema, required) => {
  const parts = field.split('.');
  let node = root;
  parts.forEach((part, i) => {
    const last = i === parts.length - 1;
    if (part === '*') return; // array element marker handled by the parent
    node.type = 'object';
    node.properties = node.properties || {};
    const nextIsArray = parts[i + 1] === '*';
    if (last) {
      node.properties[part] = schema;
      if (required) { node.required = node.required || []; if (!node.required.includes(part)) node.required.push(part); }
    } else {
      node.properties[part] = node.properties[part] || (nextIsArray ? { type: 'array', items: { type: 'object' } } : { type: 'object' });
      node = nextIsArray ? (node.properties[part].items = node.properties[part].items || { type: 'object' }) : node.properties[part];
    }
  });
};

const buildOpenApi = (routes, { title = `${brand.name} API`, version = '1.0.0' } = {}) => {
  const paths = {};
  const tags = new Set();

  for (const r of routes) {
    const oaPath = toOpenApiPath(r.path);
    const method = r.method.toLowerCase();
    const tag = (r.path.split('/')[2] || 'root');
    tags.add(tag);

    const parameters = [];
    for (const m of r.path.matchAll(/:([A-Za-z0-9_]+)/g)) {
      parameters.push({ name: m[1], in: 'path', required: true, schema: { type: 'string' } });
    }
    const body = { type: 'object', properties: {} };
    let hasBody = false;
    const querySeen = new Set();

    for (const ctx of r.validators || []) {
      for (const field of ctx.fields) {
        for (const location of ctx.locations) {
          const schema = schemaFromStack(ctx.stack);
          const required = !ctx.optional;
          if (location === 'params') {
            const p = parameters.find((x) => x.name === field);
            if (p) p.schema = { ...p.schema, ...schema };
          } else if (location === 'query' && !querySeen.has(field)) {
            querySeen.add(field);
            parameters.push({ name: field, in: 'query', required, schema });
          } else if (location === 'body') {
            hasBody = true;
            putField(body, field, schema, required);
          }
        }
      }
    }

    if (MONEY_ROUTES.has(`${r.method} ${r.path}`)) {
      parameters.push({
        name: 'Idempotency-Key', in: 'header', required: true,
        description: 'Unique 16–128 character key. Replaying the same key and body returns the original result; the same key with a different body is rejected with 409.',
        schema: { type: 'string', minLength: 16, maxLength: 128 }
      });
    }

    const protectedRoute = r.auth === 'JWT';
    const responses = {
      '2XX': { description: 'Success. Envelope: { success: true, message, data }' },
      '429': { $ref: '#/components/responses/TooManyRequests' }
    };
    if (hasBody || parameters.some((p) => p.in !== 'header')) responses['400'] = { $ref: '#/components/responses/ValidationError' };
    if (protectedRoute) responses['401'] = { $ref: '#/components/responses/Unauthorized' };
    if (protectedRoute && r.roles && r.roles !== '(any authenticated role)') responses['403'] = { $ref: '#/components/responses/Forbidden' };
    if (/\{/.test(oaPath)) responses['404'] = { $ref: '#/components/responses/NotFound' };

    const op = {
      tags: [tag],
      summary: `${r.method} ${r.path}`,
      operationId: camel(`${method} ${r.path}`),
      ...(parameters.length ? { parameters } : {}),
      ...(hasBody ? { requestBody: { required: true, content: { 'application/json': { schema: body } } } } : {}),
      responses,
      ...(protectedRoute ? { security: [{ bearerAuth: [] }] } : { security: [] }),
      ...(protectedRoute && r.roles ? { 'x-allowed-roles': r.roles } : {})
    };
    paths[oaPath] = paths[oaPath] || {};
    paths[oaPath][method] = op;
  }

  const errorResponse = (description) => ({ description, content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } });
  return {
    openapi: '3.0.3',
    info: {
      title, version,
      description: 'Generated from the running Express router and its express-validator rules by `npm run docs:openapi`. Do not edit by hand. Success bodies other than the standard envelope are not described. Refresh/logout use the HTTP-only `refreshToken` cookie.'
    },
    servers: [{ url: '/' }],
    tags: [...tags].sort().map((name) => ({ name })),
    paths,
    components: {
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
      schemas: {
        Error: {
          type: 'object', required: ['success', 'message'],
          properties: {
            success: { type: 'boolean', enum: [false] },
            message: { type: 'string' },
            errors: { type: 'array', items: { type: 'object', properties: { field: { type: 'string' }, message: { type: 'string' } } } },
            requestId: { type: 'string' }
          }
        }
      },
      responses: {
        ValidationError: errorResponse('Validation failed'),
        Unauthorized: errorResponse('Missing, invalid or expired access token'),
        Forbidden: errorResponse('Authenticated but not allowed for this role'),
        NotFound: errorResponse('Resource not found'),
        TooManyRequests: errorResponse('Rate limit exceeded; see Retry-After header')
      }
    }
  };
};

module.exports = { buildOpenApi, schemaFromStack };
