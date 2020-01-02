const request = require('request');
const async = require('async');
const { SourceMapConsumer, SourceMapGenerator } = require('source-map');
const dataUriToBuffer = require('data-uri-to-buffer');

const validateMappings = require('./validateMappings');
const Report = require('./report');
const { resolveSourceMapSource } = require('./utils');
const {
  UnableToFetchSourceMapError,
  UnableToFetchSourceError,
  InvalidSourceMapFormatError,
  InvalidJSONError,
  BadContentError,
  ResourceTimeoutError
} = require('./errors');
const { MAX_TIMEOUT } = require('./constants');

/**
 * Wrapper around request except it handles source maps contained in data-uris
 */
function requestSourceMap(sourceMapUrl, options, callback) {
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
    request(sourceMapUrl, options, callback);
  }
}

/**
 * Validates a source map located at the given url
 * @param {string} sourceMapUrl URL containing the source map
 * @param {string} generatedContent The generated (transpiled) file content
 * @param {function} callback Invoked after validation is finished, passed a Report object
 */
function validateSourceMap(sourceMapUrl, generatedContent, callback) {
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
        return;
      }

      // Build array of tuples of [originalUrl, resolvedUrl] for each source
      // [
      //   ['add.js', 'https://example.com/static/add.js'],
      //   ['sub.js', 'https://example.com/static/sub.js']
      // ]

      const resolvedSources = sourceMapConsumer.sources.map((sourceUrl) => {
        return [
          sourceUrl,
          resolveSourceMapSource(sourceUrl, sourceMapUrl, rawSourceMap)
        ];
      });

      const validateMappingsCallback = (
        _sourceMapConsumer,
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
          .pushSource(...resolvedSources.map(([, resolvedUrl]) => resolvedUrl));

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
    }
  );
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
      request(resolvedUrl, { timeout: MAX_TIMEOUT }, (err, response, body) => {
        if (err) {
          console.error(err);
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
      console.error(err);
    }
    // Generate the new source map consumer with updated sources
    const fullSourceMapConsumer = SourceMapConsumer(generator.toJSON());

    report.pushError(...validationErrors.filter(_err => _err));
    callback(fullSourceMapConsumer, report);
  });
}

module.exports = validateSourceMap;
