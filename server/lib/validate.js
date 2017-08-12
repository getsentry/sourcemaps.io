const request = require('request');
const async = require('async');
const urljoin = require('url-join');
const {SourceMapConsumer, SourceMapGenerator} = require('source-map');

const MAX_TIMEOUT = 5000;
const MAX_REPORT_SIZE = 100;

class Report {
  constructor(report = {}) {
    this.warnings = report.warnings || [];
    this.errors = report.errors || [];
    this.sources = report.sources || [];
  }

  pushError(...errors) {
    this.errors.push(...errors);
    return this;
  }

  pushWarning(...warnings) {
    this.warnings.push(...warnings);
    return this;
  }

  pushSource(...sources) {
    this.sources.push(...sources);
    return this;
  }

  concat(report) {
    const copy = new Report(this);
    copy.errors = copy.errors.concat(report.errors);
    copy.warnings = copy.warnings.concat(report.warnings);
    copy.sources = copy.sources.concat(report.sources);
    return copy;
  }

  size() {
    return this.errors.length + this.warnings.length;
  }
}

const {
  SourceMapNotFoundError,
  UnableToFetchMinifiedError,
  UnableToFetchSourceMapError,
  UnableToFetchSourceError,
  InvalidSourceMapFormatError,
  InvalidJSONError,
  LineNotFoundError,
  BadTokenError,
  BadContentError,
  BadColumnError,
  ResourceTimeoutError
} = require('./errors');


function validateMapping(mapping, sourceLines, generatedLines) {
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

  let sourceToken = origLine.slice(
    mapping.originalColumn,
    mapping.originalColumn + mapping.name.length
  ).trim();

  // Token matches what we expect; everything looks good, bail out
  if (sourceToken === mapping.name) {
    return null;
  }

  // Start of token starts with a quote or apostrophe. This might be
  // a bug in Uglify where it maps a token to the string of a token
  // incorrectly - but it should still be fine for end users.
  if (sourceToken.startsWith('\'') || sourceToken.startsWith('"')) {
    sourceToken = origLine.slice(
      mapping.originalColumn + 1,
      mapping.originalColumn + mapping.name.length + 1
    ).trim();
  }

  if (sourceToken === mapping.name) {
    return null;
  }

  // If the line _contains_ the expected token somewhere, the source
  // map will likely work fine (especially for Sentry).
  const ErrorClass = origLine.indexOf(sourceToken) > -1
    ? BadColumnError
    : BadTokenError;

  const {generatedColumn} = mapping;

  let generatedLine;
  try {
    generatedLine = generatedLines[mapping.generatedLine - 1];
  } catch (e) {} // eslint-disable-line no-empty

  // Take 5 lines of original context
  const contextLines = [];
  for (let i = Math.max(mapping.originalLine - 3, 0); i < mapping.originalLine + 2 && i < sourceLines.length; i++) {
    contextLines.push([i + 1, sourceLines[i]]);
  }


  // Take 100 chars of context around generated line
  const generatedContext = generatedLine.slice(generatedColumn - 50, generatedColumn + 50);

  return new ErrorClass(mapping.source, {
    token: sourceToken,
    expected: mapping.name,
    mapping: {
      originalContext: contextLines,
      originalLine: mapping.originalLine,
      originalColumn: mapping.originalColumn,
      generatedContext,
      generatedLine: mapping.generatedLine,
      generatedColumn: mapping.generatedColumn
    }
  });
}
function validateMappings(sourceMapConsumer, generatedLines) {
  const report = new Report();
  const sourceCache = {};

  sourceMapConsumer.eachMapping((mapping) => {
    if (report.size() >= MAX_REPORT_SIZE) {
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

    const error = validateMapping(mapping, sourceLines, generatedLines);

    // Treat bad column errors as warnings (since they'll work fine for
    // most apps)
    if (error instanceof BadColumnError) {
      report.pushWarning(error);
    } else if (error) {
      report.pushError(error);
    }
  });
  return report;
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
  return /^(https?|webpack|file):\/\//.test(targetUrl)
    ? targetUrl
    : urljoin(urlBase, targetUrl);
}

/**
 * Validates a target transpiled/minified file located at a given url
 */
function validateGeneratedFile(url, callback) {
  const report = new Report();

  request(url, {timeout: MAX_TIMEOUT}, (error, response, body) => {
    if (error) {
      if (error.message === 'ESOCKETTIMEDOUT') {
        report.pushError(new ResourceTimeoutError(url, MAX_TIMEOUT));
        return void callback(report);
      }

      return void console.log(error);
    }

    if (response && response.statusCode !== 200) {
      report.pushError(new UnableToFetchMinifiedError(url));
      callback(report);
      return;
    }

    const sourceMappingURL = getSourceMapLocation(response, body);
    if (!sourceMappingURL) {
      report.pushError(new SourceMapNotFoundError(url));
      callback(report);
      return;
    }

    const resolvedSourceMappingURL = resolveUrl(url, sourceMappingURL);

    validateSourceMap(resolvedSourceMappingURL, response.body, (sourceMapReport) => {
      const finalReport = report.concat(sourceMapReport);
      callback(finalReport);
    });
  });
}

function resolveSourceMapSource(sourceUrl, sourceMapUrl, rawSourceMap) {
  let resolvedUrl = sourceUrl;

  if (!resolvedUrl.startsWith('http') && rawSourceMap.sourceRoot !== undefined) {
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

/**
 * Validates a source map located at the given url
 */
function validateSourceMap(sourceMapUrl, generatedContent, callback) {
  let report = new Report();
  request(sourceMapUrl, {timeout: MAX_TIMEOUT}, (error, response, body) => {
    if (error) {
      if (error.message === 'ESOCKETTIMEDOUT') {
        report.pushError(new ResourceTimeoutError(sourceMapUrl, MAX_TIMEOUT));
        return void callback(report);
      }
      return void console.log(error);
    }

    if (response && response.statusCode !== 200) {
      report.pushError(new UnableToFetchSourceMapError(sourceMapUrl));
      callback(report);
      return;
    }

    let rawSourceMap;
    try {
      rawSourceMap = JSON.parse(body);
    } catch (err) {
      report.pushError(new InvalidJSONError(sourceMapUrl, err));
      callback(report);
      return;
    }

    let sourceMapConsumer;
    try {
      sourceMapConsumer = new SourceMapConsumer(rawSourceMap);
    } catch (err) {
      report.pushError(new InvalidSourceMapFormatError(sourceMapUrl, err));
      callback(report);
    }

    // Build array of tuples of [originalUrl, resolvedUrl] for each source
    // [
    //   ['add.js', 'https://example.com/static/add.js'],
    //   ['sub.js', 'https://example.com/static/sub.js']
    // ]

    const resolvedSources = sourceMapConsumer.sources
      .map((sourceUrl) => {
        return [sourceUrl, resolveSourceMapSource(sourceUrl, sourceMapUrl, rawSourceMap)];
      });

    const validateMappingsCallback = (_sourceMapConsumer, fetchesReport = new Report()) => {
      const generatedLines = generatedContent.split('\n');
      const mappingsReport = validateMappings(_sourceMapConsumer, generatedLines);

      report = report
        .concat(fetchesReport)
        .concat(mappingsReport)
        .pushSource(...resolvedSources.map(([, resolvedUrl]) => resolvedUrl));

      callback(report);
    };

    // If every source is inlined inside the source map, go directly to
    // validate mappings ...
    if (sourceMapConsumer.hasContentsOfAllSources()) {
      return void validateMappingsCallback(sourceMapConsumer);
    }

    // ... otherwise, we need to fetch missing sources first.
    fetchSources(sourceMapConsumer, resolvedSources, validateMappingsCallback);
  });
}

function fetchSources(sourceMapConsumer, resolvedSources, callback) {
  const report = new Report();

  // We're going to generate a new source map consumer, building
  // on top of the existing one
  const generator = SourceMapGenerator.fromSourceMap(sourceMapConsumer);

  // Figure out which sources we need to fetch
  const missingSources = resolvedSources.filter(([sourceUrl]) => {
    return !sourceMapConsumer.sourceContentFor(sourceUrl, true);
  });

  const requests = missingSources.map(([sourceUrl, resolvedUrl]) => {
    return (cb) => {
      request(resolvedUrl, {timeout: MAX_TIMEOUT}, (err, response, body) => {
        if (err) {
          console.log(err);
        }
        if (!response || response.statusCode !== 200) {
          return void cb(null, new UnableToFetchSourceError(resolvedUrl));
        }

        // Did the source return HTML?
        const bodyStart = body.slice(0, 200).trim();
        if (/^<!doctype/i.test(bodyStart)) {
          return void cb(null, new BadContentError(resolvedUrl));
        }

        generator.setSourceContent(sourceUrl, body);
        cb(null);
      });
    };
  });

  // TODO: explore parallelizing requests (want to make sure we don't accidentally
  // open 100+ connections and exhaust cloud function memory)
  async.series(requests, (err, validationErrors) => {
    if (err) {
      console.log(err);
    }
    // Generate the new source map consumer with updated sources
    const fullSourceMapConsumer = SourceMapConsumer(generator.toJSON());

    report.pushError(...validationErrors.filter(_err => _err));
    callback(fullSourceMapConsumer, report);
  });
}

module.exports = {
  validateGeneratedFile,
  validateMappings,
  resolveSourceMapSource
};
