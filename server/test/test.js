const fs = require('fs');
const path = require('path');
const nock = require('nock');
const assert = require('assert');

const {validateSourceFile, validateMappings} = require('../lib/validate');

const {
  SourceMapNotFoundError,
  UnableToFetchMinifiedError,
  UnableToFetchSourceMapError,
  InvalidSourceMapFormatError,
  InvalidJSONError,
  BadTokenError,
  ResourceTimeoutError
} = require('../lib/errors');

const host = 'https://example.org';
const appPath = '/static/app.js';
const url = `${host}${appPath}`;

const RAW_SOURCE_MAP = JSON.stringify({
  version: 3,
  file: 'min.js',
  names: ['bar', 'baz', 'n'],
  sources: ['one.js', 'two.js'],
  sourceRoot: `${host}/static/`,
  mappings: 'CAAC,IAAI,IAAM,SAAUA,GAClB,OAAOC,IAAID;CCDb,IAAI,IAAM,SAAUE,GAClB,OAAOA'
});

describe('validateSourceFile', function() {
  it('should download both source files and source maps', function(done) {
    nock(host).get(appPath)
      .reply(200, '//#sourceMappingURL=app.js.map');

    nock(host).get('/static/app.js.map').reply(200, RAW_SOURCE_MAP);

    validateSourceFile(url, function(errors, sources) {
      assert.equal(errors.length, 0);
      assert.deepEqual(sources, [
        `${host}/static/one.js`, // note: source-map resolves these
        `${host}/static/two.js`
      ]);
      done();
    });
  });

  describe('source map location', function() {
    it('should resolve absolute sourceMappingURLs', function(done) {
      nock(host)
        .get(appPath)
        .reply(200, '//#sourceMappingURL=https://127.0.0.1:8000/static/app.js.map');

      nock('https://127.0.0.1:8000').get('/static/app.js.map').reply(200, RAW_SOURCE_MAP);

      validateSourceFile(url, function(errors) {
        assert.equal(errors.length, 0);
        done();
      });
    });

    it("should locate sourceMappingURLs that aren't on the last line", function(done) {
      nock(host).get(appPath).reply(200, '//#sourceMappingURL=app.js.map\n\n');

      nock(host).get('/static/app.js.map').reply(200, RAW_SOURCE_MAP);

      validateSourceFile(url, function(errors) {
        assert.equal(errors.length, 0);
        done();
      });
    });
    it('should resolve SourceMap headers', function(done) {
      nock(host).get(appPath).reply(200, 'function(){}();', {
        SourceMap: 'app.js.map'
      });

      nock(host).get('/static/app.js.map').reply(200, RAW_SOURCE_MAP);

      validateSourceFile(url, function(errors) {
        assert.equal(errors.length, 0);
        done();
      });
    });

    it('should resolve X-SourceMap headers', function(done) {
      nock(host).get(appPath).reply(200, 'function(){}();', {
        'X-SourceMap': 'app.js.map'
      });

      nock(host).get('/static/app.js.map').reply(200, RAW_SOURCE_MAP);

      validateSourceFile(url, function(errors) {
        assert.equal(errors.length, 0);
        done();
      });
    });

    it('should report missing sourceMappingURL', function(done) {
      nock(host).get(appPath).reply(200, 'function(){}();');

      validateSourceFile(url, function(errors) {
        assert.equal(errors.length, 1);
        assert.equal(errors[0].constructor, SourceMapNotFoundError);
        done();
      });
    });
  }); // source map location

  describe('http failures', function() {
    it('should report a source file that times out', function(done) {
      this.timeout(6000);

      nock(host).get(appPath).socketDelay(5001).reply(200, '<html></html>');

      validateSourceFile(url, function(errors) {
        assert.equal(errors.length, 1);
        assert.equal(errors[0].constructor, ResourceTimeoutError);
        done();
      });
    });

    it('should report a source file does not return 200', function(done) {
      nock(host).get(appPath).reply(401, 'Not Authenticated');

      validateSourceFile(url, function(errors) {
        assert.equal(errors.length, 1);
        assert.equal(errors[0].constructor, UnableToFetchMinifiedError);
        done();
      });
    });

    it('should report a source map file does not return 200', function(done) {
      nock(host).get(appPath).reply(200, '//#sourceMappingURL=app.js.map');

      nock(host).get('/static/app.js.map').reply(401, 'Not Authenticated');

      validateSourceFile(url, function(errors) {
        assert.equal(errors.length, 1);
        assert.equal(errors[0].constructor, UnableToFetchSourceMapError);
        done();
      });
    });
  }); // http failures

  describe('parsing failures', function() {
    it('should report a source map file that is no valid JSON', function(done) {
      nock(host).get(appPath).reply(200, '//#sourceMappingURL=app.js.map');

      nock(host).get('/static/app.js.map').reply(200, '!@#(!*@#(*&@');

      validateSourceFile(url, function(errors) {
        assert.equal(errors.length, 1);
        assert.equal(errors[0].constructor, InvalidJSONError);
        assert.equal(
          errors[0].message,
          'Does not parse as JSON: Unexpected token ! in JSON at position 0'
        );
        done();
      });
    });

    it('should report a source map file that does not parse as a Source Map', function(
      done
    ) {
      nock(host).get(appPath).reply(200, '//#sourceMappingURL=app.js.map');

      nock(host).get('/static/app.js.map').reply(200, '{"version":"3"}');

      validateSourceFile(url, function(errors) {
        assert.equal(errors.length, 1);
        assert.equal(errors[0].constructor, InvalidSourceMapFormatError);
        assert.equal(
          errors[0].message,
          'Invalid SourceMap format: "sources" is a required argument.'
        );
        done();
      });
    });
  }); // parsing failures

  describe('mappings', function() {
    it('should parse and validate every mapping', function(done) {
      const minFilePath = path.join(__dirname, 'fixtures', 'build', 'add.dist.js');
      const mapFilePath = `${minFilePath}.map`;

      nock(host).get(appPath).reply(200, fs.readFileSync(minFilePath, 'utf-8'));
      nock(host)
        .get('/static/add.dist.js.map')
        .reply(200, fs.readFileSync(mapFilePath, 'utf-8'));

      validateSourceFile(url, function(errors) {
        assert.equal(errors.length, 0);
        done();
      });
    });

    it("should detect invalid mappings where tokens don't match source content", function(
      done
    ) {
      const minFilePath = path.join(__dirname, 'fixtures', 'build', 'add.fuzzinput.js');
      const mapFilePath = `${minFilePath}.map`;

      nock(host).get(appPath).reply(200, fs.readFileSync(minFilePath, 'utf-8'));
      nock(host)
        .get('/static/add.fuzzinput.js.map')
        .reply(200, fs.readFileSync(mapFilePath, 'utf-8'));

      validateSourceFile(url, function(errors) {
        assert.notEqual(errors.length, 0);
        assert.equal(errors[0].constructor, BadTokenError);
        assert.equal(
          errors[0].message,
          'Expected token not in correct location'
        );
        done();
      });
    });
  });
});

describe('validateMappings', function () {
  it('should stop at 100 errors', function () {
    let sourceMapConsumer = {
      eachMapping: function (callback) {
        // mock source map consumer with 200 entries;
        // each one should fail
        for (let i = 0; i < 200; i++) {
          callback({
            source: 'app.js',
            name: 'foo',
            originalLine: 10,
            originalColumn: 10
          })
        }
      },
      sourceContentFor: function (source) {
        return 'lol();';
      }
    }
    // assert `validateMappings` stopped at 100 entries
    const errors = validateMappings(sourceMapConsumer);
    assert.equal(errors.length, 100);
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
