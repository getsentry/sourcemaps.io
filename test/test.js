const nock = require('nock');
const assert = require('assert');

const validate = require('../lib/validate');

const {SourceMapNotFoundError} = require('../lib/errors');

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

  it('should detect missing sourceMappingURL', function (done) {
    nock(host)
      .get(path)
      .reply(200, 'function(){}();');

    validate(url, function (errors) {
      assert.equal(errors.length, 1);
      assert.equal(errors[0].constructor, SourceMapNotFoundError);
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
