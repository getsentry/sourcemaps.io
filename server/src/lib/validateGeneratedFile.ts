import request from 'request';

const validateSourceMap = require('./validateSourceMap');
const Report = require('./report');

import {
  SourceMapNotFoundError,
  UnableToFetchMinifiedError,
  ResourceTimeoutError
} from './errors';
import { MAX_TIMEOUT } from './constants';
const { resolveUrl, getSourceMapLocation } = require('./utils');

/**
 * Validates a target transpiled/minified file located at a given url
 * @param {string} url The target URL of the generated (transpiled) file,
 *            e.g. https://example.com/static/app.min.js
 * @param {function} callback Invoked when validation is finished, passed a Report object
 */
function validateGeneratedFile(url: string, callback: Function) {
  const report = new Report({ url });

  request(url, { timeout: MAX_TIMEOUT }, (error, response, body) => {
    if (error) {
      if (error.message === 'ESOCKETTIMEDOUT') {
        report.pushError(new ResourceTimeoutError(url, MAX_TIMEOUT));
        return void callback(report);
      }

      return void console.error(error);
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

    validateSourceMap(
      resolvedSourceMappingURL,
      response.body,
      (sourceMapReport: any) => {
        const finalReport = report.concat(sourceMapReport);
        callback(finalReport);
      }
    );
  });
}

module.exports = validateGeneratedFile;
