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

describe('validateSourceFile', () => {
  it('should download both source files and source maps', (done) => {
    nock(host).get(appPath).reply(200, '//#sourceMappingURL=app.js.map');

    nock(host).get('/static/app.js.map').reply(200, RAW_SOURCE_MAP);

    validateSourceFile(url, (errors, sources) => {
      assert.equal(errors.length, 0);
      assert.deepEqual(sources, [
        `${host}/static/one.js`, // note: source-map resolves these
        `${host}/static/two.js`
      ]);
      done();
    });
  });

  describe('source map location', () => {
    it('should resolve absolute sourceMappingURLs', (done) => {
      nock(host)
        .get(appPath)
        .reply(200, '//#sourceMappingURL=https://127.0.0.1:8000/static/app.js.map');

      nock('https://127.0.0.1:8000').get('/static/app.js.map').reply(200, RAW_SOURCE_MAP);

      validateSourceFile(url, (errors) => {
        assert.equal(errors.length, 0);
        done();
      });
    });

    it("should locate sourceMappingURLs that aren't on the last line", (done) => {
      nock(host).get(appPath).reply(200, '//#sourceMappingURL=app.js.map\n\n');

      nock(host).get('/static/app.js.map').reply(200, RAW_SOURCE_MAP);

      validateSourceFile(url, (errors) => {
        assert.equal(errors.length, 0);
        done();
      });
    });
    it('should resolve SourceMap headers', (done) => {
      nock(host).get(appPath).reply(200, 'function(){}();', {
        SourceMap: 'app.js.map'
      });

      nock(host).get('/static/app.js.map').reply(200, RAW_SOURCE_MAP);

      validateSourceFile(url, (errors) => {
        assert.equal(errors.length, 0);
        done();
      });
    });

    it('should resolve X-SourceMap headers', (done) => {
      nock(host).get(appPath).reply(200, 'function(){}();', {
        'X-SourceMap': 'app.js.map'
      });

      nock(host).get('/static/app.js.map').reply(200, RAW_SOURCE_MAP);

      validateSourceFile(url, (errors) => {
        assert.equal(errors.length, 0);
        done();
      });
    });

    it('should report missing sourceMappingURL', (done) => {
      nock(host).get(appPath).reply(200, 'function(){}();');

      validateSourceFile(url, (errors) => {
        assert.equal(errors.length, 1);
        assert.equal(errors[0].constructor, SourceMapNotFoundError);
        done();
      });
    });
  }); // source map location

  describe('http failures', () => {
    it('should report a source file that times out', (done) => {
      nock(host).get(appPath).socketDelay(5001).reply(200, '<html></html>');

      validateSourceFile(url, (errors) => {
        assert.equal(errors.length, 1);
        assert.equal(errors[0].constructor, ResourceTimeoutError);
        assert.equal(errors[0].message, 'Resource timed out (exceeded 5000ms): https://example.org/static/app.js');
        done();
      });
    }).timeout(6000);

    it('should report a source map that times out', (done) => {
      nock(host).get(appPath).reply(200, '//#sourceMappingURL=app.js.map');

      nock(host).get('/static/app.js.map').socketDelay(5001).reply(200, RAW_SOURCE_MAP);
      validateSourceFile(url, (errors) => {
        assert.equal(errors.length, 1);
        assert.equal(errors[0].constructor, ResourceTimeoutError);
        assert.equal(errors[0].message, 'Resource timed out (exceeded 5000ms): https://example.org/static/app.js.map');
        done();
      });
    }).timeout(6000);

    it('should report a source file does not return 200', (done) => {
      nock(host).get(appPath).reply(401, 'Not Authenticated');

      validateSourceFile(url, (errors) => {
        assert.equal(errors.length, 1);
        assert.equal(errors[0].constructor, UnableToFetchMinifiedError);
        done();
      });
    });

    it('should report a source map file does not return 200', (done) => {
      nock(host).get(appPath).reply(200, '//#sourceMappingURL=app.js.map');

      nock(host).get('/static/app.js.map').reply(401, 'Not Authenticated');

      validateSourceFile(url, (errors) => {
        assert.equal(errors.length, 1);
        assert.equal(errors[0].constructor, UnableToFetchSourceMapError);
        done();
      });
    });
  }); // http failures

  describe('parsing failures', () => {
    it('should report a source map file that is no valid JSON', (done) => {
      nock(host).get(appPath).reply(200, '//#sourceMappingURL=app.js.map');

      nock(host).get('/static/app.js.map').reply(200, '!@#(!*@#(*&@');

      validateSourceFile(url, (errors) => {
        assert.equal(errors.length, 1);
        assert.equal(errors[0].constructor, InvalidJSONError);
        assert.equal(
          errors[0].message,
          'Does not parse as JSON: Unexpected token ! in JSON at position 0'
        );
        done();
      });
    });

    it('should report a source map file that does not parse as a Source Map', (
      done
    ) => {
      nock(host).get(appPath).reply(200, '//#sourceMappingURL=app.js.map');

      nock(host).get('/static/app.js.map').reply(200, '{"version":"3"}');

      validateSourceFile(url, (errors) => {
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

  describe('mappings', () => {
    it('should parse and validate every mapping', (done) => {
      const minFilePath = path.join(__dirname, 'fixtures', 'build', 'add.dist.js');
      const mapFilePath = `${minFilePath}.map`;

      nock(host).get(appPath).reply(200, fs.readFileSync(minFilePath, 'utf-8'));
      nock(host)
        .get('/static/add.dist.js.map')
        .reply(200, fs.readFileSync(mapFilePath, 'utf-8'));

      validateSourceFile(url, (errors) => {
        assert.equal(errors.length, 0);
        done();
      });
    });

    it("should detect invalid mappings where tokens don't match source content", (
      done
    ) => {
      const minFilePath = path.join(__dirname, 'fixtures', 'build', 'add.fuzzinput.js');
      const mapFilePath = `${minFilePath}.map`;

      nock(host).get(appPath).reply(200, fs.readFileSync(minFilePath, 'utf-8'));
      nock(host)
        .get('/static/add.fuzzinput.js.map')
        .reply(200, fs.readFileSync(mapFilePath, 'utf-8'));

      validateSourceFile(url, (errors) => {
        assert.notEqual(errors.length, 0);
        assert.equal(errors[0].constructor, BadTokenError);
        assert.equal(errors[0].message, 'Expected token not in correct location');
        done();
      });
    });
  });
});

describe('validateMappings', () => {
  it('should stop at 100 errors', () => {
    const sourceMapConsumer = {
      eachMapping(callback) {
        // mock source map consumer with 200 entries;
        // each one should fail
        for (let i = 0; i < 200; i++) {
          callback({
            source: 'app.js',
            name: 'foo',
            originalLine: 10,
            originalColumn: 10
          });
        }
      },
      sourceContentFor() {
        return 'lol();';
      }
    };
    // assert `validateMappings` stopped at 100 entries
    const errors = validateMappings(sourceMapConsumer);
    assert.equal(errors.length, 100);
  });
});

describe('errors', () => {
  it('should stringify nicely', () => {
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
