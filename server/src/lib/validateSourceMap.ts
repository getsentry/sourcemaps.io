import request from 'request';
import dataUriToBuffer from 'data-uri-to-buffer';

import async, {
  AsyncResultArrayCallback,
  AsyncResultCallback,
  AsyncFunction
} from 'async';

import {
  SourceMapConsumer,
  SourceMapGenerator,
  RawSourceMap,
  BasicSourceMapConsumer
} from 'source-map';

import validateMappings from './validateMappings';
import Report from './report';
import { resolveSourceMapSource } from './utils';
import {
  UnableToFetchSourceMapError,
  UnableToFetchSourceError,
  InvalidSourceMapFormatError,
  InvalidJSONError,
  BadContentError,
  ResourceTimeoutError
} from './errors';

import { MAX_TIMEOUT } from './constants';

/**
 * Wrapper around request except it handles source maps contained in data-uris
 */
function requestSourceMap(
  sourceMapUrl: string,
  options: request.CoreOptions,
  callback: (error: any, response: Partial<request.Response>, body: any) => void
) {
  if (sourceMapUrl.startsWith('data:')) {
    const body = dataUriToBuffer(sourceMapUrl);

    // mock response object; pretend we made a http request
    callback(
      null,
      {
        statusCode: 200
      },
      body.toString()
    );
  } else {
    request(sourceMapUrl, options, callback as request.RequestCallback);
  }
}

/**
 * Validates a source map located at the given url
 * @param {string} sourceMapUrl URL containing the source map
 * @param {string} generatedContent The generated (transpiled) file content
 * @param {function} callback Invoked after validation is finished, passed a Report object
 */
export default function validateSourceMap(
  sourceMapUrl: string,
  generatedContent: string,
  callback: Function
) {
  let report = new Report();
  report.sourceMap = sourceMapUrl;

  requestSourceMap(
    sourceMapUrl,
    { timeout: MAX_TIMEOUT },
    (error, response, body) => {
      if (error) {
        if (error.message === 'ESOCKETTIMEDOUT') {
          report.pushError(new ResourceTimeoutError(sourceMapUrl, MAX_TIMEOUT));
          return void callback(report);
        }
        return void console.error(error);
      }

      if (response && response.statusCode !== 200) {
        report.pushError(new UnableToFetchSourceMapError(sourceMapUrl));
        callback(report);
        return;
      }

      let rawSourceMap: RawSourceMap;
      try {
        rawSourceMap = JSON.parse(body);
      } catch (err) {
        report.pushError(new InvalidJSONError(sourceMapUrl, err));
        callback(report);
        return;
      }

      new SourceMapConsumer(rawSourceMap)
        .then((sourceMapConsumer: BasicSourceMapConsumer) => {
          // Build array of tuples of [originalUrl, resolvedUrl] for each source
          // [
          //   ['add.js', 'https://example.com/static/add.js'],
          //   ['sub.js', 'https://example.com/static/sub.js']
          // ]
          const resolvedSources: Array<[
            string,
            string
          ]> = sourceMapConsumer.sources.map(sourceUrl => {
            return [
              sourceUrl,
              resolveSourceMapSource(sourceUrl, sourceMapUrl, rawSourceMap)
            ];
          });

          const validateMappingsCallback = (
            _sourceMapConsumer: SourceMapConsumer,
            fetchesReport = new Report()
          ) => {
            const generatedLines = generatedContent.split('\n');
            const mappingsReport = validateMappings(
              _sourceMapConsumer,
              generatedLines
            );

            report = report
              .concat(fetchesReport)
              .concat(mappingsReport)
              .pushSource(
                ...resolvedSources.map(([, resolvedUrl]) => resolvedUrl)
              );

            callback(report);
          };

          // If every source is inlined inside the source map, go directly to
          // validate mappings ...
          if (sourceMapConsumer.hasContentsOfAllSources()) {
            return void validateMappingsCallback(sourceMapConsumer);
          }

          // ... otherwise, we need to fetch missing sources first.
          fetchSources(
            sourceMapConsumer,
            resolvedSources,
            validateMappingsCallback
          );
        })
        .catch(err => {
          report.pushError(new InvalidSourceMapFormatError(sourceMapUrl, err));
          callback(report);
        });
    }
  );
}

function fetchSources(
  sourceMapConsumer: BasicSourceMapConsumer,
  resolvedSources: Array<[string, string]>,
  callback: Function
) {
  const report = new Report();

  // We're going to generate a new source map consumer, building
  // on top of the existing one
  const generator = SourceMapGenerator.fromSourceMap(sourceMapConsumer);

  // Figure out which sources we need to fetch
  const missingSources = resolvedSources.filter(([sourceUrl]) => {
    return !sourceMapConsumer.sourceContentFor(sourceUrl, true);
  });

  const requests: AsyncFunction<Error, Error>[] = missingSources.map(
    ([sourceUrl, resolvedUrl]) => {
      return (cb: AsyncResultCallback<Error>) => {
        request(
          resolvedUrl,
          { timeout: MAX_TIMEOUT },
          (err, response, body) => {
            if (err) {
              console.error(err);
            }
            if (!response || response.statusCode !== 200) {
              cb(null, new UnableToFetchSourceError(resolvedUrl));
              return void 0;
            }

            // Did the source return HTML?
            const bodyStart = body.slice(0, 200).trim();
            if (/^<!doctype/i.test(bodyStart)) {
              return void cb(null, new BadContentError(resolvedUrl));
            }

            generator.setSourceContent(sourceUrl, body);
            cb(null, undefined);
          }
        );
      };
    }
  );

  // TODO: explore parallelizing requests (want to make sure we don't accidentally
  // open 100+ connections and exhaust cloud function memory)
  async.series(
    requests,
    (err?: Error | null, validationErrors?: Array<Error | undefined>) => {
      if (err || !validationErrors) {
        return void console.error(err);
      }
      // Generate the new source map consumer with updated sources
      new SourceMapConsumer(generator.toJSON()).then(fullSourceMapConsumer => {
        report.pushError(
          ...validationErrors.filter(
            (_err): _err is Error => _err !== undefined
          )
        ); // Filter out undefined values
        callback(fullSourceMapConsumer, report);
      });
    }
  );
}
