const request = require('request');

const validateSourceMap = require('./validateSourceMap');
const Report = require('./report');

const {
  SourceMapNotFoundError,
  UnableToFetchMinifiedError,
  ResourceTimeoutError
} = require('./errors');
const {MAX_TIMEOUT} = require('./constants');
const {resolveUrl} = require('./utils');


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

/**
 * Validates a target transpiled/minified file located at a given url
 */
function validateGeneratedFile(url, callback) {
  const report = new Report({url});

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

module.exports = validateGeneratedFile;
