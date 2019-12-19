class SourceMapNotFoundError extends Error {
  resolutions: Array<string>;
  constructor(url: string) {
    super();
    this.name = this.constructor.name;
    this.message = `Unable to locate a source map in ${url}`;
    this.resolutions = [
      'Add a <code>//# sourceMappingURL=</code> declaration',
      'Add a SourceMap HTTP response header'
    ];
  }
}

class UnableToFetchError extends Error {
  resolutions: Array<string>;
  constructor(url: string) {
    super();
    this.name = this.constructor.name;
    this.message = `Unable to fetch ${url}`;
    this.resolutions = ['Is your URL correct?'];
  }
}

class UnableToFetchSourceError extends UnableToFetchError {};
class UnableToFetchMinifiedError extends UnableToFetchError {};
class UnableToFetchSourceMapError extends UnableToFetchError {
  constructor(url: string) {
    super(url);
    this.resolutions = ['SourceMap declaration found, but could not load the file.'];
  }
};

class InvalidJSONError extends Error {
  resolutions: Array<string>;

  constructor(url: string, error: Error) {
    super();

    this.name = this.constructor.name;
    let message: string = 'Does not parse as JSON';
    if (error && error.message) {
      message += `: ${error.message}`;
    }
    this.message = message;
    this.resolutions = ['Everything is broken. Is this really a Source Map?'];
  }
}

class InvalidSourceMapFormatError extends Error {
  resolutions: Array<string>;
  constructor(url: string, error: Error) {
    super();

    this.name = this.constructor.name;
    let message = 'Invalid SourceMap format';
    if (error && error.message) {
      message += `: ${error.message}`;
    }
    this.message = message;
  
    this.resolutions = ['Everything is broken. Is this really a Source Map?'];
  }
}

class ResourceTimeoutError extends Error {
  resolutions: Array<string>;

  constructor(url: string, duration: number) {
    super();
    this.name = this.constructor.name;
    this.message = `Resource timed out (exceeded ${duration}ms): ${url}`;
    this.resolutions = ['Is your URL correct?'];    
  }
}

class BadContentError extends Error {
  resolutions: Array<string>;

  constructor(url: string) {
    super();
    this.name = this.constructor.name;
    this.message = `File is not JavaScript: ${url}`;
    this.resolutions = [
      'Is this URL accessible externally?',
      'Is this URL accessible without a user session?'
    ];
  }
}

class LineNotFoundError extends Error {
  source: string;
  column: number;
  line: number;
  resolutions: Array<string>;

  constructor(source: string, options: {line: number, column: number}) {
    super();
    this.name = this.constructor.name;
    this.source = source;
  
    const {line, column} = options;
    this.line = line;
    this.column = column;
    this.message = 'Line not found in source file';
    this.resolutions = [];
  }
}

class BadTokenError extends Error {
  source: string;
  token: string;
  expected: string;
  mapping: string
  resolutions: Array<string>;

  constructor(source: string, options: {token: string, expected: string, mapping: string}) {
    super();
    this.name = this.constructor.name;
    this.source = source;
  
    const {token, expected, mapping} = options;
    this.token = token;
    this.expected = expected;
    this.mapping = mapping;
  
    this.message = 'Expected token not in correct location';
    this.resolutions = [];
  }
}

class BadColumnError extends Error {};

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
