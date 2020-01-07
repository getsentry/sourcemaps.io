const path = require('path');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [path.join(__dirname, '/src/**/__tests__/**/*.spec.{js,ts}')],
  setupFiles: [
    path.join(__dirname, '/src/lib/__tests__/fixtures/build-fixtures')
  ],
  rootDir: __dirname
};
