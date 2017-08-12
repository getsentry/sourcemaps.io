function SourceMapNotFoundError(url) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = `Unable to locate a source map in ${url}`;
  this.resolutions = [
    'Add a <code>//# sourceMappingURL=</code> declaration',
    'Add a SourceMap HTTP response header'
  ];
}

function UnableToFetchError(url) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = `Unable to fetch ${url}`;
  this.resolutions = ['Is your URL correct?'];
}

function UnableToFetchSourceError(url) {
  UnableToFetchError.call(this, url);
}

function UnableToFetchMinifiedError(url) {
  UnableToFetchError.call(this, url);
}

function UnableToFetchSourceMapError(url) {
  UnableToFetchError.call(this, url);
  this.resolutions = ['SourceMap declaration found, but could not load the file.'];
}

function InvalidJSONError(url, error) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  let message = 'Does not parse as JSON';
  if (error && error.message) {
    message += `: ${error.message}`;
  }
  this.message = message;
  this.resolutions = ['Everything is broken. Is this really a Source Map?'];
}

function InvalidSourceMapFormatError(url, error) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  let message = 'Invalid SourceMap format';
  if (error && error.message) {
    message += `: ${error.message}`;
  }
  this.message = message;

  this.resolutions = ['Everything is broken. Is this really a Source Map?'];
}

function ResourceTimeoutError(url, duration) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = `Resource timed out (exceeded ${duration}ms): ${url}`;
  this.resolutions = ['Is your URL correct?'];
}

function BadContentError(url) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = `File is not JavaScript: ${url}`;
  this.resolutions = [
    'Is this URL accessible externally?',
    'Is this URL accessible without a user session?'
  ];
}

function LineNotFoundError(source, options) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.source = source;

  const {line, column} = options;
  this.line = line;
  this.column = column;
  this.message = 'Line not found in source file';
  this.resolutions = [];
}

function BadTokenError(source, options) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.source = source;

  const {token, expected, mapping} = options;
  this.token = token;
  this.expected = expected;
  this.mapping = mapping;

  this.message = 'Expected token not in correct location';
  this.resolutions = [];
}

function BadColumnError(source, options) {
  BadTokenError.call(this, source, options);
}

module.exports = {
  SourceMapNotFoundError,
  UnableToFetchError,
  UnableToFetchMinifiedError,
  UnableToFetchSourceError,
  UnableToFetchSourceMapError,
  InvalidSourceMapFormatError,
  InvalidJSONError,
  LineNotFoundError,
  BadTokenError,
  BadContentError,
  BadColumnError,
  ResourceTimeoutError
};
