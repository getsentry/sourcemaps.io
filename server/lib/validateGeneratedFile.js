const request = require('request');

const validateSourceMap = require('./validateSourceMap');
const Report = require('./report');

const {
  SourceMapNotFoundError,
  UnableToFetchMinifiedError,
  ResourceTimeoutError
} = require('./errors');
const {MAX_TIMEOUT} = require('./constants');
const {resolveUrl, getSourceMapLocation} = require('./utils');


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
