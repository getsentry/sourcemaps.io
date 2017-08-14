const {resolveSourceMapSource} = require('../utils');

const {HOST, DEFAULT_SOURCE_MAP} = require('./fixtures/examples');

it('should prepend sourceRoot if present', () => {
  const sourceMap = Object.assign({}, DEFAULT_SOURCE_MAP);
  sourceMap.sourceRoot = 'https://example2.com/dist/';
  expect(
    resolveSourceMapSource('one.js', `${HOST}/static/app.min.js.map`, sourceMap)
  ).toEqual('https://example2.com/dist/one.js');
});

it('should not prepend sourceRoot if input URLs are absolute', () => {
  const sourceMap = Object.assign({}, DEFAULT_SOURCE_MAP);
  sourceMap.sourceRoot = 'https://example2.com/dist/';
  expect(
    resolveSourceMapSource(
      'https://example3.com/dist/one.js',
      `${HOST}/static/app.min.js.map`,
      sourceMap
    )
  ).toEqual('https://example3.com/dist/one.js');
});

it('should resolve relative to source map URL if sourceRoot is absent', () => {
  const sourceMap = Object.assign({}, DEFAULT_SOURCE_MAP);
  delete sourceMap.sourceRoot;
  expect(
    resolveSourceMapSource('one.js', `${HOST}/static/app.min.js.map`, sourceMap)
  ).toEqual(`${HOST}/static/one.js`);
});

it('should resolve relative to source map URL if resulting URL is not absolute', () => {
  const sourceMap = Object.assign({}, DEFAULT_SOURCE_MAP);
  sourceMap.sourceRoot = '/some/path/'; // completely tossed out, according to spec
  expect(
    resolveSourceMapSource('one.js', `${HOST}/static/app.min.js.map`, sourceMap)
  ).toEqual(`${HOST}/static/one.js`);
});

it('should leave webpack:/// urls as-is', () => {
  const sourceMap = Object.assign({}, DEFAULT_SOURCE_MAP);
  delete sourceMap.sourceRoot;
  expect(
    resolveSourceMapSource(
      'webpack:///one.js',
      `${HOST}/static/app.min.js.map`,
      sourceMap
    )
  ).toEqual('webpack:///one.js');
});
