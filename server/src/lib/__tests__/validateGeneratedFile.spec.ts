/* eslint newline-per-chained-call:0 */
import fs from 'fs';
import path from 'path';
import nock from 'nock';

import validateGeneratedFile from '../validateGeneratedFile';

const {
  HOST,
  RAW_DEFAULT_SOURCE_MAP,
  RAW_INLINE_SOURCE_MAP,
  ONE_JS,
  TWO_JS
} = require('./fixtures/examples');

const appPath = '/static/app.js';
const url = `${HOST}${appPath}`;

it('should download the target minified file, source maps, and external source files', done => {
  const scope = nock(HOST)
    .get(appPath)
    .reply(200, '//#sourceMappingURL=app.js.map')
    .get('/static/app.js.map')
    .reply(200, RAW_DEFAULT_SOURCE_MAP)
    .get('/static/one.js')
    .reply(200, ONE_JS)
    .get('/static/two.js')
    .reply(200, TWO_JS);

  validateGeneratedFile(url, report => {
    // verify all mocked requests satisfied
    scope.done();

    expect(report.errors).toHaveLength(0);
    expect(report.sources).toEqual([
      `${HOST}/static/one.js`, // note: source-map resolves these
      `${HOST}/static/two.js`
    ]);
    done();
  });
});

describe('source map location', () => {
  it('should resolve absolute sourceMappingURLs', done => {
    nock(HOST)
      .get(appPath)
      .reply(
        200,
        '//#sourceMappingURL=https://127.0.0.1:8000/static/app.js.map'
      );

    nock('https://127.0.0.1:8000')
      .get('/static/app.js.map')
      .reply(200, RAW_INLINE_SOURCE_MAP);

    validateGeneratedFile(url, report => {
      expect(report.errors).toHaveLength(0);
      done();
    });
  });

  it('should resolve sourceMappingURLs that contain data-uri source map data', done => {
    const minFilePath = path.join(
      __dirname,
      'fixtures',
      'build',
      'add.dataUri.js'
    );

    nock(HOST)
      .get(appPath)
      .reply(200, fs.readFileSync(minFilePath, 'utf-8'));

    validateGeneratedFile(url, report => {
      expect(report.errors).toHaveLength(0);
      done();
    });
  });

  it("should locate sourceMappingURLs that aren't on the last line", done => {
    nock(HOST)
      .get(appPath)
      .reply(200, '//#sourceMappingURL=app.js.map\n\n');

    nock(HOST)
      .get('/static/app.js.map')
      .reply(200, RAW_INLINE_SOURCE_MAP);
    validateGeneratedFile(url, report => {
      expect(report.errors).toHaveLength(0);
      done();
    });
  });
  it('should resolve SourceMap headers', done => {
    nock(HOST)
      .get(appPath)
      .reply(200, 'function(){}();', {
        SourceMap: 'app.js.map'
      });

    nock(HOST)
      .get('/static/app.js.map')
      .reply(200, RAW_INLINE_SOURCE_MAP);

    validateGeneratedFile(url, report => {
      expect(report.errors).toHaveLength(0);
      done();
    });
  });

  it('should resolve X-SourceMap headers', done => {
    nock(HOST)
      .get(appPath)
      .reply(200, 'function(){}();', {
        'X-SourceMap': 'app.js.map'
      });

    nock(HOST)
      .get('/static/app.js.map')
      .reply(200, RAW_INLINE_SOURCE_MAP);

    validateGeneratedFile(url, report => {
      expect(report.errors).toHaveLength(0);
      done();
    });
  });

  it('should report missing sourceMappingURL', done => {
    nock(HOST)
      .get(appPath)
      .reply(200, 'function(){}();');

    validateGeneratedFile(url, report => {
      expect(report.errors).toHaveLength(1);
      expect(report.errors[0].name).toBe('SourceMapNotFoundError');
      done();
    });
  });
}); // source map location

describe('http failures', () => {
  it('should report a target file that times out', done => {
    nock(HOST)
      .get(appPath)
      .socketDelay(5001)
      .reply(200, '<html></html>');

    validateGeneratedFile(url, report => {
      expect(report.errors).toHaveLength(1);
      expect(report.errors[0].name).toBe('ResourceTimeoutError');
      expect(report.errors[0]).toHaveProperty(
        'message',
        'Resource timed out (exceeded 5000ms): https://example.org/static/app.js'
      );
      done();
    });
  });

  it('should report a source map that times out', done => {
    nock(HOST)
      .get(appPath)
      .reply(200, '//#sourceMappingURL=app.js.map');

    nock(HOST)
      .get('/static/app.js.map')
      .socketDelay(5001)
      .reply(200, RAW_DEFAULT_SOURCE_MAP);
    validateGeneratedFile(url, report => {
      expect(report.errors).toHaveLength(1);
      expect(report.errors[0].name).toBe('ResourceTimeoutError');
      expect(report.errors[0]).toHaveProperty(
        'message',
        'Resource timed out (exceeded 5000ms): https://example.org/static/app.js.map'
      );
      done();
    });
  });

  it('should report a target file does not return 200', done => {
    nock(HOST)
      .get(appPath)
      .reply(401, 'Not Authenticated');

    validateGeneratedFile(url, report => {
      expect(report.errors).toHaveLength(1);
      expect(report.errors[0].name).toBe('UnableToFetchMinifiedError');
      done();
    });
  });

  it('should report a target file does not return a connection', done => {
    nock(HOST)
      .get(appPath)
      .replyWithError({
        errno: 'ECONNREFUSED',
        code: 'ECONNREFUSED',
        syscall: 'connect',
        address: '127.0.0.1',
        port: 1337
      });

    validateGeneratedFile(url, report => {
      expect(report.errors).toHaveLength(1);
      expect(report.errors[0].name).toBe('ConnectionRefusedError');
      done();
    });
  });

  it('should report a source map file does not return 200', done => {
    nock(HOST)
      .get(appPath)
      .reply(200, '//#sourceMappingURL=app.js.map');

    nock(HOST)
      .get('/static/app.js.map')
      .reply(401, 'Not Authenticated');

    validateGeneratedFile(url, report => {
      expect(report.errors).toHaveLength(1);
      expect(report.errors[0].name).toBe('UnableToFetchSourceMapError');
      done();
    });
  });

  it('should report a source file that does not return 200', done => {
    const scope = nock(HOST)
      .get(appPath)
      .reply(200, '//#sourceMappingURL=app.js.map')
      .get('/static/app.js.map')
      .reply(200, RAW_DEFAULT_SOURCE_MAP)
      .get('/static/one.js')
      .reply(200, ONE_JS)
      .get('/static/two.js')
      .reply(401, 'Not authenticated');

    validateGeneratedFile(url, report => {
      // verify all mocked requests satisfied
      scope.done();
      expect(report.errors).toHaveLength(1);
      expect(report.errors[0].name).toBe('UnableToFetchSourceError');
      done();
    });
  });
}); // http failures

describe('parsing failures', () => {
  it('should report a source map file that is no valid JSON', done => {
    nock(HOST)
      .get(appPath)
      .reply(200, '//#sourceMappingURL=app.js.map');

    nock(HOST)
      .get('/static/app.js.map')
      .reply(200, '!@#(!*@#(*&@');

    validateGeneratedFile(url, report => {
      expect(report.errors).toHaveLength(1);
      expect(report.errors[0].name).toBe('InvalidJSONError');
      expect(report.errors[0]).toHaveProperty(
        'message',
        expect.stringContaining('Does not parse as JSON: Unexpected token')
      );
      done();
    });
  });

  it('should report a source map file that does not parse as a Source Map', done => {
    nock(HOST)
      .get(appPath)
      .reply(200, '//#sourceMappingURL=app.js.map');

    nock(HOST)
      .get('/static/app.js.map')
      .reply(200, '{"version":"3"}');

    validateGeneratedFile(url, report => {
      expect(report.errors).toHaveLength(1);
      expect(report.errors[0].name).toBe('InvalidSourceMapFormatError');
      expect(report.errors[0]).toHaveProperty(
        'message',
        'Invalid SourceMap format: "sources" is a required argument.'
      );
      done();
    });
  });
}); // parsing failures

describe('content failures', () => {
  it('should report source files that are not JavaScript', done => {
    const scope = nock(HOST)
      .get(appPath)
      .reply(200, '//#sourceMappingURL=app.js.map')
      .get('/static/app.js.map')
      .reply(200, RAW_DEFAULT_SOURCE_MAP)
      .get('/static/one.js')
      .reply(200, ONE_JS)
      .get('/static/two.js')
      .reply(200, '         \n\n\n<!DOCTYPE html><html>lol</html>');

    validateGeneratedFile(url, report => {
      scope.done();
      expect(report.errors).toHaveLength(1);
      expect(report.errors[0].name).toBe('BadContentError');
      expect(report.errors[0]).toHaveProperty(
        'message',
        'File is not JavaScript: https://example.org/static/two.js'
      );
      done();
    });
  });
});

describe('mappings', () => {
  describe('inline sources', () => {
    it('should parse and validate every mapping', done => {
      const minFilePath = path.join(
        __dirname,
        'fixtures',
        'build',
        'add.inlineSources.js'
      );
      const mapFilePath = `${minFilePath}.map`;

      nock(HOST)
        .get(appPath)
        .reply(200, fs.readFileSync(minFilePath, 'utf-8'));
      nock(HOST)
        .get('/static/add.inlineSources.js.map')
        .reply(200, fs.readFileSync(mapFilePath, 'utf-8'));

      validateGeneratedFile(url, report => {
        expect(report.errors).toHaveLength(0);
        done();
      });
    });

    it("should detect invalid mappings where tokens aren't located on same line", done => {
      const minFilePath = path.join(
        __dirname,
        'fixtures',
        'build',
        'add.fuzzLines.js'
      );
      const mapFilePath = `${minFilePath}.map`;

      nock(HOST)
        .get(appPath)
        .reply(200, fs.readFileSync(minFilePath, 'utf-8'));
      nock(HOST)
        .get('/static/add.fuzzLines.js.map')
        .reply(200, fs.readFileSync(mapFilePath, 'utf-8'));

      validateGeneratedFile(url, report => {
        expect(report.errors).not.toHaveLength(0);
        expect(report.errors[0].name).toBe('BadTokenError');
        expect(report.errors[0]).toHaveProperty(
          'message',
          'Expected token not in correct location'
        );
        done();
      });
    });

    it('should detect invalid mappings where tokens are on wrong column', done => {
      const minFilePath = path.join(
        __dirname,
        'fixtures',
        'build',
        'add.fuzzColumns.js'
      );
      const mapFilePath = `${minFilePath}.map`;

      nock(HOST)
        .get(appPath)
        .reply(200, fs.readFileSync(minFilePath, 'utf-8'));
      nock(HOST)
        .get('/static/add.fuzzColumns.js.map')
        .reply(200, fs.readFileSync(mapFilePath, 'utf-8'));

      validateGeneratedFile(url, report => {
        expect(report.warnings).not.toHaveLength(0);
        expect(report.warnings[0].name).toBe('BadColumnError');
        expect(report.warnings[0]).toHaveProperty(
          'message',
          'Expected token not in correct location'
        );
        done();
      });
    });
  });
});
