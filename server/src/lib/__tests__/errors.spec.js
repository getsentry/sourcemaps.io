const { SourceMapNotFoundError } = require('../errors');

describe('errors', () => {
  it('should stringify nicely', () => {
    expect(
      JSON.parse(
        JSON.stringify(
          new SourceMapNotFoundError('https://example.org/static/app.js')
        )
      )
    ).toEqual({
      name: 'SourceMapNotFoundError',
      message:
        'Unable to locate a source map in https://example.org/static/app.js',
      resolutions: [
        'Add a <code>//# sourceMappingURL=</code> declaration',
        'Add a SourceMap HTTP response header'
      ]
    });
  });
});
