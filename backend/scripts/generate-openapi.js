// node scripts/generate-openapi.js  ->  docs/upgrade/openapi.json
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'x'.repeat(40);
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'y'.repeat(40);
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1/unused';
const fs = require('fs');
const path = require('path');
const { collectRoutes } = require('./list-routes');
const { buildOpenApi } = require('./lib/openapi');

const spec = buildOpenApi(collectRoutes());
const target = path.join(__dirname, '../../docs/upgrade/openapi.json');
fs.writeFileSync(target, `${JSON.stringify(spec, null, 2)}\n`);
console.log(`wrote ${Object.keys(spec.paths).length} paths`);
process.exit(0);
