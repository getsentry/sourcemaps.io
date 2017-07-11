function SourceMapNotFoundError(url) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = `Unable to locate a SourceMap in ${url}`;
  this.resolutions = [
    'Add a <code>//# sourceMappingURL=</code> declaration',
    'Add a SourceMap HTTP response header'
  ]
}

module.exports = {
    SourceMapNotFoundError: SourceMapNotFoundError
}