const path = require('path');

require('./dist/lib/__tests__/fixtures/build-fixtures');

module.exports = {
  testMatch: [path.join(__dirname, '/dist/**/__tests__/**/*.spec.js?(x)')],
  rootDir: __dirname
};
