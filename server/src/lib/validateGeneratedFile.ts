import request from 'request';

import validateSourceMap from './validateSourceMap';
import Report from './report';

import {
  SourceMapNotFoundError,
  UnableToFetchMinifiedError,
  ResourceTimeoutError,
  SocketRefusedError,
  UnknownError
} from './errors';
import { MAX_TIMEOUT } from './constants';
import { resolveUrl, getSourceMapLocation } from './utils';
import { setTag } from '@sentry/node';

/**
 * Validates a target transpiled/minified file located at a given url
 * @param {string} url The target URL of the generated (transpiled) file,
 *            e.g. https://example.com/static/app.min.js
 * @param {function} callback Invoked when validation is finished, passed a Report object
 */
export function validateMinifiedFileAtUrl(
  url: string,
  callback: (report: Report) => void
) {
  const report = new Report({ url });

  request(url, { timeout: MAX_TIMEOUT }, (error, response, body) => {
    if (error) {
      setTag('outgoing_request_had_error', true);

      if (error.message === 'ESOCKETTIMEDOUT') {
        report.pushError(new ResourceTimeoutError(url, MAX_TIMEOUT));
      } else if (error.code === 'ECONNREFUSED') {
        report.pushError(new SocketRefusedError(url));
      } else {
        report.pushError(new UnknownError(url));
      }

      callback(report);
      return;
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
