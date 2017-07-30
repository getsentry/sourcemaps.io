const request = require('request');
const urljoin = require('url-join');
const {SourceMapConsumer} = require('source-map');

const MAX_TIMEOUT = 5000;

const {
  SourceMapNotFoundError,
  UnableToFetchMinifiedError,
  UnableToFetchSourceMapError,
  InvalidSourceMapFormatError,
  InvalidJSONError,
  LineNotFoundError,
  BadTokenError,
  ResourceTimeoutError
} = require('./errors');

const MAX_MAPPING_ERRORS = 100;

function validateMapping(mapping, sourceLines) {
  let origLine;
  try {
    origLine = sourceLines[mapping.originalLine - 1];
  } catch (e) {}

  if (!origLine) {
    return new LineNotFoundError(mapping.source, {
      line: mapping.originalLine,
      column: mapping.originalColumn
    });
  }

  const sourceToken = origLine.slice(
    mapping.originalColumn,
    mapping.originalColumn + mapping.name.length
  ); //mapping.name.length);
  if (sourceToken.trim() !== mapping.name) {
    return new BadTokenError(mapping.source, {
      token: sourceToken,
      expected: mapping.name,
      line: mapping.originalLine,
      column: mapping.originalColumn
    });
  }
}
function validateMappings(sourceMapConsumer) {
  const errors = [];
  const sourceCache = {};

  sourceMapConsumer.eachMapping(function(mapping) {
    if (errors.length >= MAX_MAPPING_ERRORS) {
      return;
    }

    // If we don't have a token name for this mapping, skip
    if (!mapping.name) {
      return;
    }

    const {source} = mapping;
    let sourceLines;
    if (sourceCache.hasOwnProperty(source)) {
      sourceLines = sourceCache[source];
    } else {
      const sourceContent = sourceMapConsumer.sourceContentFor(mapping.source);
      if (!sourceContent) {
        // TODO: blow up
        return;
      }
      sourceLines = sourceContent.split(/\n/);
      sourceCache[mapping.source] = sourceLines;
    }

    const error = validateMapping(mapping, sourceLines);
    if (error) {
      errors.push(error);
    }
  });
  return errors;
}

function getSourceMapLocation(response, body) {
  // First, look for Source Map HTTP headers
  const sourceMapHeader =
    response.headers['x-sourcemap'] || response.headers['sourcemap'];

  if (sourceMapHeader) return sourceMapHeader;

  // If no headers, look for a sourceMappingURL directive on the last line
  const lines = body.split(/\n/);
  if (!lines.length > 0) {
    return null;
  }

  // consider anything in last 5 lines; browsers and tools like sentry.io
  // are similarly generous
  const last = lines.slice(-5);
  const DIRECTIVE_RE = /sourceMappingURL\=(\S+)$/;

  let line, match;
  while (last.length) {
    line = last.pop();
    match = line.match(DIRECTIVE_RE);
    if (match) return match[1];
  }

  return null;
}

function resolveSourceMappingURL(sourceUrl, sourceMappingURL) {
  const urlBase = sourceUrl.replace(/\/[^\/]+$/, '');
  return sourceMappingURL.startsWith('http')
    ? sourceMappingURL
    : urljoin(urlBase, sourceMappingURL);
}

function validateSourceFile(url, callback) {
  const errors = [];
  request(url, {timeout: MAX_TIMEOUT}, function(error, response, body) {
    if (error) {
      if (error.message === 'ESOCKETTIMEDOUT') {
        errors.push(new ResourceTimeoutError(url, MAX_TIMEOUT));
        return void callback(errors);
      }

      return void console.log(error);
    }

    if (response && response.statusCode !== 200) {
      errors.push(new UnableToFetchMinifiedError(url));
      return void callback(errors);
    }

    const sourceMappingURL = getSourceMapLocation(response, body);
    if (!sourceMappingURL) {
      errors.push(new SourceMapNotFoundError(url));
      return void callback(errors);
    }

    const resolvedSourceMappingURL = resolveSourceMappingURL(url, sourceMappingURL);

    validateSourceMap(resolvedSourceMappingURL, function(sourceMapErrors, sources) {
      if (sourceMapErrors && sourceMapErrors.length) {
        errors.push.apply(errors, sourceMapErrors);
      }
      callback(errors, sources);
    });
  });
}

function validateSourceMap(url, callback) {
  const errors = [];
  request(url, {timeout: MAX_TIMEOUT}, function(error, response, body) {
    if (error) {
      if (error.message === 'ESOCKETTIMEDOUT') {
        errors.push(new ResourceTimeoutError(url, MAX_TIMEOUT));
        return void callback(errors);
      }
      return void console.log(error);
    }

    if (response && response.statusCode !== 200) {
      errors.push(new UnableToFetchSourceMapError(url));
      return void callback(errors);
    }

    let rawSourceMap;
    try {
      rawSourceMap = JSON.parse(body);
    } catch (err) {
      errors.push(new InvalidJSONError(url, err));
      return void callback(errors);
    }

    let sourceMapConsumer;
    try {
      sourceMapConsumer = new SourceMapConsumer(rawSourceMap);
    } catch (err) {
      errors.push(new InvalidSourceMapFormatError(url, err));
      return void callback(errors);
    }

    let validateErrors = validateMappings(sourceMapConsumer);
    errors.push.apply(errors, validateErrors);

    callback(errors, sourceMapConsumer.sources);
  });
}

module.exports = {
  validateSourceFile,
  validateMappings
};
