const HOST = 'https://example.org';

const DEFAULT_SOURCE_MAP = {
  version: 3,
  file: 'min.js',
  names: ['bar', 'baz', 'n'],
  sources: ['one.js', 'two.js'],
  sourceRoot: `${HOST}/static/`,
  mappings:
    'CAAC,IAAI,IAAM,SAAUA,GAClB,OAAOC,IAAID;CCDb,IAAI,IAAM,SAAUE,GAClB,OAAOA'
};
const RAW_DEFAULT_SOURCE_MAP = JSON.stringify(DEFAULT_SOURCE_MAP);

const ONE_JS = ' ONE.foo = function (bar) {\n   return baz(bar);\n };';
const TWO_JS = ' TWO.inc = function (n) {\n   return n + 1;\n };';

const INLINE_SOURCE_MAP = Object.assign(
  {
    sourcesContent: [ONE_JS, TWO_JS]
  },
  DEFAULT_SOURCE_MAP
);
const RAW_INLINE_SOURCE_MAP = JSON.stringify(INLINE_SOURCE_MAP);

module.exports = {
  HOST,
  DEFAULT_SOURCE_MAP,
  RAW_DEFAULT_SOURCE_MAP,
  ONE_JS,
  TWO_JS,
  INLINE_SOURCE_MAP,
  RAW_INLINE_SOURCE_MAP
};
