// Petit lanceur cross-platform pour forcer APP_ENV avant de demarrer server.js.
// Usage : node start-env.js local  |  node start-env.js production
const env = process.argv[2];
if (!env) {
  console.error('Usage: node start-env.js <local|production>');
  process.exit(1);
}
process.env.APP_ENV = env;
require('./server.js');
