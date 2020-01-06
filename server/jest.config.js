const path = require('path');

module.exports = {
  testMatch: [path.join(__dirname, '/dist/**/__tests__/**/*.spec.js?(x)')],
  setupFiles: [
    path.join(__dirname, '/dist/lib/__tests__/fixtures/build-fixtures')
  ],
  rootDir: __dirname
};
