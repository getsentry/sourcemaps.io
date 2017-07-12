const nock = require('nock');
const assert = require('assert');

const validate = require('../lib/validate');

const {
  SourceMapNotFoundError,
  UnableToFetchMinifiedError,
  UnableToFetchSourceMapError,
  InvalidSourceMapFormatError
} = require('../lib/errors');

const host = 'https://example.org';
const path = '/static/app.js';
const url = `${host}${path}`;

describe('validate', function () {
  it('should download both source files and source maps', function (done) {
    nock(host)
      .get(path)
      .reply(200, '//#sourceMappingURL=app.js.map');

    nock(host)
      .get('/static/app.js.map')
      .reply(200, '{"version": 3}');

    validate(url, function (errors) {
      assert.equal(errors.length, 0);
      done();
    });
  });

  it('should resolve absolute sourceMappiingURLs', function (done) {
    nock(host)
      .get(path)
      .reply(200, '//#sourceMappingURL=https://127.0.0.1:8000/static/app.js.map');

    nock('https://127.0.0.1:8000')
      .get('/static/app.js.map')
      .reply(200, '{"version": 3}');

    validate(url, function (errors) {
      assert.equal(errors.length, 0);
      done();
    });
  });

  it('should report a source file does not return 200', function (done) {
    nock(host)
      .get(path)
      .reply(401, 'Not Authenticated');

    validate(url, function (errors) {
      assert.equal(errors.length, 1);
      assert.equal(errors[0].constructor, UnableToFetchMinifiedError);
      done();
    });
  });

  it('should report missing sourceMappingURL', function (done) {
    nock(host)
      .get(path)
      .reply(200, 'function(){}();');

    validate(url, function (errors) {
      assert.equal(errors.length, 1);
      assert.equal(errors[0].constructor, SourceMapNotFoundError);
      done();
    });
  });

  it('should report a source map file does not return 200', function (done) {
    nock(host)
      .get(path)
      .reply(200, '//#sourceMappingURL=app.js.map');

    nock(host)
      .get('/static/app.js.map')
      .reply(401, 'Not Authenticated');

    validate(url, function (errors) {
      assert.equal(errors.length, 1);
      assert.equal(errors[0].constructor, UnableToFetchSourceMapError);
      done();
    });
  });

  it('should report a source map file that does not parse', function (done) {
      nock(host)
      .get(path)
      .reply(200, '//#sourceMappingURL=app.js.map');

    nock(host)
      .get('/static/app.js.map')
      .reply(200, '!@#(!*@#(*&@');

    validate(url, function (errors) {
      assert.equal(errors.length, 1);
      assert.equal(errors[0].constructor, InvalidSourceMapFormatError);
      done();
    });
  });
});

describe('errors', function () {
  it('should stringify nicely', function () {
    assert.deepEqual(
      JSON.parse(JSON.stringify(new SourceMapNotFoundError(url))),
      {
        'name': 'SourceMapNotFoundError',
        'message': 'Unable to locate a SourceMap in https://example.org/static/app.js',
        'resolutions': [
          'Add a <code>//# sourceMappingURL=</code> declaration',
          'Add a SourceMap HTTP response header'
        ]
      }
    );
  });
});
