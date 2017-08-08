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
  } catch (e) {
    /** eslint no-empty:0 */
  }

  if (!origLine) {
    return new LineNotFoundError(mapping.source, {
      line: mapping.originalLine,
      column: mapping.originalColumn
    });
  }

  const sourceToken = origLine.slice(
    mapping.originalColumn,
    mapping.originalColumn + mapping.name.length
  );

  if (sourceToken.trim() !== mapping.name) {
    return new BadTokenError(mapping.source, {
      token: sourceToken,
      expected: mapping.name,
      line: mapping.originalLine,
      column: mapping.originalColumn
    });
  }
  return null;
}
function validateMappings(sourceMapConsumer) {
  const errors = [];
  const sourceCache = {};

  sourceMapConsumer.eachMapping((mapping) => {
    if (errors.length >= MAX_MAPPING_ERRORS) {
      return;
    }

    // If we don't have a token name for this mapping, skip
    if (!mapping.name) {
      return;
    }

    const {source} = mapping;
    let sourceLines;
    if ({}.hasOwnProperty.call(sourceCache, source)) {
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
    response.headers['x-sourcemap'] || response.headers.sourcemap;

  if (sourceMapHeader) return sourceMapHeader;

  // If no headers, look for a sourceMappingURL directive on the last line
  const lines = body.split(/\n/);
  if (!lines.length > 0) {
    return null;
  }

  // consider anything in last 5 lines; browsers and tools like sentry.io
  // are similarly generous
  const last = lines.slice(-5);
  const DIRECTIVE_RE = /sourceMappingURL=(\S+)$/;

  let line;
  let match;

  while (last.length) {
    line = last.pop();
    match = line.match(DIRECTIVE_RE);
    if (match) return match[1];
  }

  return null;
}

function resolveUrl(baseUrl, targetUrl) {
  const urlBase = baseUrl.replace(/\/[^/]+$/, '');
  return targetUrl.startsWith('http')
    ? targetUrl
    : urljoin(urlBase, targetUrl);
}

function validateSourceFile(url, callback) {
  const errors = [];
  request(url, {timeout: MAX_TIMEOUT}, (error, response, body) => {
    if (error) {
      if (error.message === 'ESOCKETTIMEDOUT') {
        errors.push(new ResourceTimeoutError(url, MAX_TIMEOUT));
        return void callback(errors);
      }

      return void console.log(error);
    }

    if (response && response.statusCode !== 200) {
      errors.push(new UnableToFetchMinifiedError(url));
      callback(errors);
      return;
    }

    const sourceMappingURL = getSourceMapLocation(response, body);
    if (!sourceMappingURL) {
      errors.push(new SourceMapNotFoundError(url));
      callback(errors);
      return;
    }

    const resolvedSourceMappingURL = resolveUrl(url, sourceMappingURL);

    validateSourceMap(resolvedSourceMappingURL, (sourceMapErrors, sources) => {
      if (sourceMapErrors && sourceMapErrors.length) {
        errors.push(...sourceMapErrors);
      }
      callback(errors, sources);
    });
  });
}

function resolveSourceMapSource(sourceUrl, sourceMapUrl, rawSourceMap) {
  let resolvedUrl = sourceUrl;

  if (rawSourceMap.sourceRoot !== undefined) {
    resolvedUrl = rawSourceMap.sourceRoot + sourceUrl;
  }

  // From the spec:
  //   If the sources are not absolute URLs after prepending of the “sourceRoot”,
  //   the sources are resolved relative to the SourceMap (like resolving script
  //   src in a html document).

  if (!resolvedUrl.startsWith('http')) {
    resolvedUrl = resolveUrl(sourceMapUrl, sourceUrl);
  }
  return resolvedUrl;
}

function validateSourceMap(sourceMapUrl, callback) {
  const errors = [];
  request(sourceMapUrl, {timeout: MAX_TIMEOUT}, (error, response, body) => {
    if (error) {
      if (error.message === 'ESOCKETTIMEDOUT') {
        errors.push(new ResourceTimeoutError(sourceMapUrl, MAX_TIMEOUT));
        return void callback(errors);
      }
      return void console.log(error);
    }

    if (response && response.statusCode !== 200) {
      errors.push(new UnableToFetchSourceMapError(sourceMapUrl));
      callback(errors);
      return;
    }

    let rawSourceMap;
    try {
      rawSourceMap = JSON.parse(body);
    } catch (err) {
      errors.push(new InvalidJSONError(sourceMapUrl, err));
      callback(errors);
      return;
    }

    let sourceMapConsumer;
    try {
      sourceMapConsumer = new SourceMapConsumer(rawSourceMap);
    } catch (err) {
      errors.push(new InvalidSourceMapFormatError(sourceMapUrl, err));
      callback(errors);
    }

    const validateErrors = validateMappings(sourceMapConsumer);
    errors.push(...validateErrors);

    // Resolve source map sources relative to target URL
    // e.g. add.js => https://example.com/static/add.js
    const resolvedSources = sourceMapConsumer.sources
      .map(sourceUrl => resolveSourceMapSource(sourceUrl, sourceMapUrl, rawSourceMap));

    callback(errors, resolvedSources);
  });
}

module.exports = {
  validateSourceFile,
  validateMappings,
  resolveSourceMapSource
};
