/* eslint import/no-extraneous-dependencies:0 */

// copied partially from react-scripts/scripts/test.js
// to avoid ejecting _all_ of react-scripts

const createJestConfig = require('react-scripts/scripts/utils/createJestConfig');
const path = require('path');
const paths = require('react-scripts/config/paths');

process.env.REACT_APP_VALIDATE_URL = 'http://example.com/validate';
process.env.REACT_APP_STORAGE_URL = 'http://example.com/storage';

process.env.BABEL_ENV = 'test';
process.env.NODE_ENV = 'test';
process.env.PUBLIC_URL = '';

// Ensure environment variables are read.
require('react-scripts/config/env');

const config = createJestConfig(
  relativePath => path.resolve(__dirname, 'node_modules', 'react-scripts', relativePath),
  path.resolve(paths.appSrc, '..'),
  false
);

module.exports = Object.assign(config, {
  testEnvironment: 'jsdom',
  rootDir: __dirname
});
