import { ContextMapping } from './interfaces';

class SourceMapNotFoundError extends Error {
  resolutions: Array<string>;
  constructor(url: string) {
    super();
    this.name = 'SourceMapNotFoundError';
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
    this.name = 'UnableToFetchError';
    this.message = `Unable to fetch ${url}`;
    this.resolutions = ['Is your URL correct?'];
  }
}

class UnableToFetchSourceError extends UnableToFetchError {
  constructor(url: string) {
    super(url);
    this.name = 'UnableToFetchSourceError';
  }
}

class UnableToFetchMinifiedError extends UnableToFetchError {
  constructor(url: string) {
    super(url);
    this.name = 'UnableToFetchMinifiedError';
  }
}

class UnableToFetchSourceMapError extends UnableToFetchError {
  constructor(url: string) {
    super(url);
    this.name = 'UnableToFetchSourceMapError';
    this.resolutions = [
      'SourceMap declaration found, but could not load the file.'
    ];
  }
}

class InvalidJSONError extends Error {
  resolutions: Array<string>;

  constructor(url: string, error: Error) {
    super();

    this.name = 'InvalidJSONError';
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

    this.name = 'InvalidSourceMapFormatError';
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
    this.name = 'ResourceTimeoutError';
    this.message = `Resource timed out (exceeded ${duration}ms): ${url}`;
    this.resolutions = ['Is your URL correct?'];
  }
}

class ConnectionRefusedError extends Error {
  resolutions: Array<string>;

  constructor(url: string) {
    super();
    this.name = 'ConnectionRefusedError';
    this.message = `Connection refused: ${url}`;
    this.resolutions = ['Is your URL correct?'];
  }
}

class BadContentError extends Error {
  resolutions: Array<string>;

  constructor(url: string) {
    super();
    this.name = 'BadContentError';
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

  constructor(source: string, options: { line: number; column: number }) {
    super();
    this.name = 'LineNotFoundError';
    this.source = source;

    const { line, column } = options;
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
  mapping: ContextMapping;
  resolutions: Array<string>;

  constructor(
    source: string,
    options: { token: string; expected: string; mapping: ContextMapping }
  ) {
    super();
    this.name = 'BadTokenError';
    this.source = source;

    const { token, expected, mapping } = options;
    this.token = token;
    this.expected = expected;
    this.mapping = mapping;

    this.message = 'Expected token not in correct location';
    this.resolutions = [];
  }
}

class BadColumnError extends BadTokenError {
  constructor(
    source: string,
    options: { token: string; expected: string; mapping: ContextMapping }
  ) {
    super(source, options);
    this.name = 'BadColumnError';
  }
}

class UnknownError extends Error {
  resolutions: Array<string>;

  constructor(url: string) {
    super();
    this.name = 'UnknownError';
    this.message = `An unknown error occurred for url: ${url}`;
    this.resolutions = ['Try again.'];
  }
}

export {
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
  ResourceTimeoutError,
  ConnectionRefusedError as SocketRefusedError,
  UnknownError
};
