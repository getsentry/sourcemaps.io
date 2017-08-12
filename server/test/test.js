/* eslint newline-per-chained-call:0 */
const fs = require('fs');
const path = require('path');
const nock = require('nock');
const assert = require('assert');

const {validateGeneratedFile, validateMappings, resolveSourceMapSource} = require('../lib/validate');

const {
  SourceMapNotFoundError,
  UnableToFetchSourceError,
  UnableToFetchMinifiedError,
  UnableToFetchSourceMapError,
  InvalidSourceMapFormatError,
  InvalidJSONError,
  BadColumnError,
  BadContentError,
  ResourceTimeoutError
} = require('../lib/errors');

const host = 'https://example.org';
const appPath = '/static/app.js';
const url = `${host}${appPath}`;

const DEFAULT_SOURCE_MAP = {
  version: 3,
  file: 'min.js',
  names: ['bar', 'baz', 'n'],
  sources: ['one.js', 'two.js'],
  sourceRoot: `${host}/static/`,
  mappings: 'CAAC,IAAI,IAAM,SAAUA,GAClB,OAAOC,IAAID;CCDb,IAAI,IAAM,SAAUE,GAClB,OAAOA'
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


describe('validateTargetFile', () => {
  it('should download the target minified file, source maps, and external source files', (done) => {
    const scope = nock(host)
      .get(appPath).reply(200, '//#sourceMappingURL=app.js.map')
      .get('/static/app.js.map').reply(200, RAW_DEFAULT_SOURCE_MAP)
      .get('/static/one.js').reply(200, ONE_JS)
      .get('/static/two.js').reply(200, TWO_JS);

    validateGeneratedFile(url, (report) => {
      // verify all mocked requests satisfied
      scope.done();

      assert.equal(report.errors.length, 0);
      assert.deepEqual(report.sources, [
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

      nock('https://127.0.0.1:8000').get('/static/app.js.map').reply(200, RAW_INLINE_SOURCE_MAP);

      validateGeneratedFile(url, (report) => {
        console.log(report.errors);
        assert.equal(report.errors.length, 0);
        done();
      });
    });

    it("should locate sourceMappingURLs that aren't on the last line", (done) => {
      nock(host).get(appPath).reply(200, '//#sourceMappingURL=app.js.map\n\n');

      nock(host).get('/static/app.js.map').reply(200, RAW_INLINE_SOURCE_MAP);

      validateGeneratedFile(url, (report) => {
        assert.equal(report.errors.length, 0);
        done();
      });
    });
    it('should resolve SourceMap headers', (done) => {
      nock(host).get(appPath).reply(200, 'function(){}();', {
        SourceMap: 'app.js.map'
      });

      nock(host).get('/static/app.js.map').reply(200, RAW_INLINE_SOURCE_MAP);

      validateGeneratedFile(url, (report) => {
        assert.equal(report.errors.length, 0);
        done();
      });
    });

    it('should resolve X-SourceMap headers', (done) => {
      nock(host).get(appPath).reply(200, 'function(){}();', {
        'X-SourceMap': 'app.js.map'
      });

      nock(host).get('/static/app.js.map').reply(200, RAW_INLINE_SOURCE_MAP);

      validateGeneratedFile(url, (report) => {
        assert.equal(report.errors.length, 0);
        done();
      });
    });

    it('should report missing sourceMappingURL', (done) => {
      nock(host).get(appPath).reply(200, 'function(){}();');

      validateGeneratedFile(url, (report) => {
        assert.equal(report.errors.length, 1);
        assert.equal(report.errors[0].constructor, SourceMapNotFoundError);
        done();
      });
    });
  }); // source map location

  describe('http failures', () => {
    it('should report a target file that times out', (done) => {
      nock(host).get(appPath).socketDelay(5001).reply(200, '<html></html>');

      validateGeneratedFile(url, (report) => {
        assert.equal(report.errors.length, 1);
        assert.equal(report.errors[0].constructor, ResourceTimeoutError);
        assert.equal(report.errors[0].message, 'Resource timed out (exceeded 5000ms): https://example.org/static/app.js');
        done();
      });
    }).timeout(6000);

    it('should report a source map that times out', (done) => {
      nock(host).get(appPath).reply(200, '//#sourceMappingURL=app.js.map');

      nock(host).get('/static/app.js.map').socketDelay(5001).reply(200, RAW_DEFAULT_SOURCE_MAP);
      validateGeneratedFile(url, (report) => {
        assert.equal(report.errors.length, 1);
        assert.equal(report.errors[0].constructor, ResourceTimeoutError);
        assert.equal(report.errors[0].message, 'Resource timed out (exceeded 5000ms): https://example.org/static/app.js.map');
        done();
      });
    }).timeout(6000);

    it('should report a target file does not return 200', (done) => {
      nock(host).get(appPath).reply(401, 'Not Authenticated');

      validateGeneratedFile(url, (report) => {
        assert.equal(report.errors.length, 1);
        assert.equal(report.errors[0].constructor, UnableToFetchMinifiedError);
        done();
      });
    });

    it('should report a source map file does not return 200', (done) => {
      nock(host).get(appPath).reply(200, '//#sourceMappingURL=app.js.map');

      nock(host).get('/static/app.js.map').reply(401, 'Not Authenticated');

      validateGeneratedFile(url, (report) => {
        assert.equal(report.errors.length, 1);
        assert.equal(report.errors[0].constructor, UnableToFetchSourceMapError);
        done();
      });
    });

    it('should report a source file that does not return 200', (done) => {
      const scope = nock(host)
        .get(appPath).reply(200, '//#sourceMappingURL=app.js.map')
        .get('/static/app.js.map').reply(200, RAW_DEFAULT_SOURCE_MAP)
        .get('/static/one.js').reply(200, ONE_JS)
        .get('/static/two.js').reply(401, 'Not authenticated');

      validateGeneratedFile(url, (report) => {
        // verify all mocked requests satisfied
        scope.done();
        assert.equal(report.errors.length, 1);
        assert.equal(report.errors[0].constructor, UnableToFetchSourceError);
        done();
      });
    });
  }); // http failures

  describe('parsing failures', () => {
    it('should report a source map file that is no valid JSON', (done) => {
      nock(host).get(appPath).reply(200, '//#sourceMappingURL=app.js.map');

      nock(host).get('/static/app.js.map').reply(200, '!@#(!*@#(*&@');

      validateGeneratedFile(url, (report) => {
        assert.equal(report.errors.length, 1);
        assert.equal(report.errors[0].constructor, InvalidJSONError);
        assert.equal(
          report.errors[0].message,
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

      validateGeneratedFile(url, (report) => {
        assert.equal(report.errors.length, 1);
        assert.equal(report.errors[0].constructor, InvalidSourceMapFormatError);
        assert.equal(
          report.errors[0].message,
          'Invalid SourceMap format: "sources" is a required argument.'
        );
        done();
      });
    });
  }); // parsing failures

  describe('content failures', () => {
    it('should report source files that are not JavaScript', (done) => {
      const scope = nock(host)
        .get(appPath).reply(200, '//#sourceMappingURL=app.js.map')
        .get('/static/app.js.map').reply(200, RAW_DEFAULT_SOURCE_MAP)
        .get('/static/one.js').reply(200, ONE_JS)
        .get('/static/two.js').reply(200, '         \n\n\n<!DOCTYPE html><html>lol</html>');

      validateGeneratedFile(url, (report) => {
        scope.done();
        assert.equal(report.errors.length, 1);
        assert.equal(report.errors[0].constructor, BadContentError);
        assert.equal(
          report.errors[0].message,
          'File is not JavaScript: https://example.org/static/two.js'
        );
        done();
      });
    });
  });

  describe('mappings', () => {
    describe('inline sources', () => {
      it('should parse and validate every mapping', (done) => {
        const minFilePath = path.join(__dirname, 'fixtures', 'build', 'add.inlineSources.js');
        const mapFilePath = `${minFilePath}.map`;

        nock(host).get(appPath).reply(200, fs.readFileSync(minFilePath, 'utf-8'));
        nock(host)
          .get('/static/add.inlineSources.js.map')
          .reply(200, fs.readFileSync(mapFilePath, 'utf-8'));

        validateGeneratedFile(url, (report) => {
          assert.equal(report.errors.length, 0);
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

        validateGeneratedFile(url, (report) => {
          assert.equal(report.errors.length, 0);
          assert.notEqual(report.warnings.length, 0);
          assert.equal(report.warnings[0].constructor, BadColumnError);
          assert.equal(report.warnings[0].message, 'Expected token not in correct location');
          done();
        });
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
    const report = validateMappings(sourceMapConsumer);
    assert.equal(report.errors.length, 100);
  });
});

describe('resolveSourceMapSource', () => {
  it('should prepend sourceRoot if present', () => {
    const sourceMap = Object.assign({}, DEFAULT_SOURCE_MAP);
    sourceMap.sourceRoot = 'https://example2.com/dist/';
    assert.equal(
      resolveSourceMapSource('one.js', `${host}/static/app.min.js.map`, sourceMap),
      'https://example2.com/dist/one.js'
    );
  });

  it('should not prepend sourceRoot if input URLs are absolute', () => {
    const sourceMap = Object.assign({}, DEFAULT_SOURCE_MAP);
    sourceMap.sourceRoot = 'https://example2.com/dist/';
    assert.equal(
      resolveSourceMapSource('https://example3.com/dist/one.js', `${host}/static/app.min.js.map`, sourceMap),
      'https://example3.com/dist/one.js'
    );
  });

  it('should resolve relative to source map URL if sourceRoot is absent', () => {
    const sourceMap = Object.assign({}, DEFAULT_SOURCE_MAP);
    delete sourceMap.sourceRoot;
    assert.equal(
      resolveSourceMapSource('one.js', `${host}/static/app.min.js.map`, sourceMap),
      `${host}/static/one.js`
    );
  });

  it('should resolve relative to source map URL if resulting URL is not absolute', () => {
    const sourceMap = Object.assign({}, DEFAULT_SOURCE_MAP);
    sourceMap.sourceRoot = '/some/path/'; // completely tossed out, according to spec
    assert.equal(
      resolveSourceMapSource('one.js', `${host}/static/app.min.js.map`, sourceMap),
      `${host}/static/one.js`
    );
  });

  it('should leave webpack:/// urls as-is', () => {
    const sourceMap = Object.assign({}, DEFAULT_SOURCE_MAP);
    delete sourceMap.sourceRoot;
    assert.equal(
      resolveSourceMapSource('webpack:///one.js', `${host}/static/app.min.js.map`, sourceMap),
      'webpack:///one.js'
    );
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
