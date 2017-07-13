const nock = require('nock');
const assert = require('assert');

const validate = require('../lib/validate');

const RAW_SOURCE_MAP = JSON.stringify({
  version: 3,
  file: 'min.js',
  names: ['bar', 'baz', 'n'],
  sources: ['one.js', 'two.js'],
  sourceRoot: 'http://example.com/www/js/',
  mappings: 'CAAC,IAAI,IAAM,SAAUA,GAClB,OAAOC,IAAID;CCDb,IAAI,IAAM,SAAUE,GAClB,OAAOA'
});

const {
  SourceMapNotFoundError,
  UnableToFetchMinifiedError,
  UnableToFetchSourceMapError,
  InvalidSourceMapFormatError,
  InvalidJSONError
} = require('../lib/errors');

const host = 'https://example.org';
const path = '/static/app.js';
const url = `${host}${path}`;

describe('validate', function() {
  it('should download both source files and source maps', function(done) {
    nock(host).get(path).reply(200, '//#sourceMappingURL=app.js.map');

    nock(host).get('/static/app.js.map').reply(200, RAW_SOURCE_MAP);

    validate(url, function(errors) {
      assert.equal(errors.length, 0);
      done();
    });
  });

  describe('source map location', function () {
    it('should resolve absolute sourceMappingURLs', function(done) {
      nock(host)
        .get(path)
        .reply(200, '//#sourceMappingURL=https://127.0.0.1:8000/static/app.js.map');

      nock('https://127.0.0.1:8000').get('/static/app.js.map').reply(200, RAW_SOURCE_MAP);

      validate(url, function(errors) {
        assert.equal(errors.length, 0);
        done();
      });
    });

    it('should resolve SourceMap headers', function(done) {
      nock(host)
        .get(path)
        .reply(200, 'function(){}();', {
          'SourceMap': 'app.js.map'
        });

      nock(host).get('/static/app.js.map').reply(200, RAW_SOURCE_MAP);

      validate(url, function(errors) {
        assert.equal(errors.length, 0);
        done();
      })
    });

    it('should resolve X-SourceMap headers', function(done) {
      nock(host)
        .get(path)
        .reply(200, 'function(){}();', {
          'X-SourceMap': 'app.js.map'
        });

      nock(host).get('/static/app.js.map').reply(200, RAW_SOURCE_MAP);

      validate(url, function(errors) {
        assert.equal(errors.length, 0);
        done();
      })
    });

    it('should report missing sourceMappingURL', function(done) {
      nock(host).get(path).reply(200, 'function(){}();');

      validate(url, function(errors) {
        assert.equal(errors.length, 1);
        assert.equal(errors[0].constructor, SourceMapNotFoundError);
        done();
      });
    });
  });

  it('should report a source file does not return 200', function(done) {
    nock(host).get(path).reply(401, 'Not Authenticated');

    validate(url, function(errors) {
      assert.equal(errors.length, 1);
      assert.equal(errors[0].constructor, UnableToFetchMinifiedError);
      done();
    });
  });

  it('should report a source map file does not return 200', function(done) {
    nock(host).get(path).reply(200, '//#sourceMappingURL=app.js.map');

    nock(host).get('/static/app.js.map').reply(401, 'Not Authenticated');

    validate(url, function(errors) {
      assert.equal(errors.length, 1);
      assert.equal(errors[0].constructor, UnableToFetchSourceMapError);
      done();
    });
  });

  it('should report a source map file that is no valid JSON', function(done) {
    nock(host).get(path).reply(200, '//#sourceMappingURL=app.js.map');

    nock(host).get('/static/app.js.map').reply(200, '!@#(!*@#(*&@');

    validate(url, function(errors) {
      assert.equal(errors.length, 1);
      assert.equal(errors[0].constructor, InvalidJSONError);
      assert.equal(errors[0].message, 'Does not parse as JSON: Unexpected token ! in JSON at position 0')
      done();
    });
  });

  it('should report a source map file that does not parse as a Source Map', function(done) {
    nock(host).get(path).reply(200, '//#sourceMappingURL=app.js.map');

    nock(host).get('/static/app.js.map').reply(200, '{"version":"3"}');

    validate(url, function(errors) {
      assert.equal(errors.length, 1);
      assert.equal(errors[0].constructor, InvalidSourceMapFormatError);
      assert.equal(errors[0].message, 'Invalid SourceMap format: "sources" is a required argument.')
      done();
    });
  });
});

describe('errors', function() {
  it('should stringify nicely', function() {
    assert.deepEqual(JSON.parse(JSON.stringify(new SourceMapNotFoundError(url))), {
      name: 'SourceMapNotFoundError',
      message: 'Unable to locate a SourceMap in https://example.org/static/app.js',
      resolutions: [
        'Add a <code>//# sourceMappingURL=</code> declaration',
        'Add a SourceMap HTTP response header'
      ]
    });
  });
});
