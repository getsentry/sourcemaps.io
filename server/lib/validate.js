const request = require('request');
const urljoin = require('url-join');
const {SourceMapConsumer} = require('source-map');

const {
  SourceMapNotFoundError,
  UnableToFetchMinifiedError,
  UnableToFetchSourceMapError,
  InvalidSourceMapFormatError,
  InvalidJSONError
} = require('./errors');

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

  const last = lines[lines.length - 1];
  const match = last.match(/sourceMappingURL\=(\S+)$/);
  if (!match) {
    return null;
  }

  return match[1];
}

function resolveSourceMappingURL(sourceUrl, sourceMappingURL) {
  const urlBase = sourceUrl.replace(/\/[^\/]+$/, '');
  return sourceMappingURL.startsWith('http')
    ? sourceMappingURL
    : urljoin(urlBase, sourceMappingURL);
}

function getSourceFile(url, callback) {
  const errors = [];
  request(url, function(error, response, body) {
    if (error) {
      console.log(error);
      return;
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

    getSourceMap(resolvedSourceMappingURL, function(sourceMapErrors) {
      if (sourceMapErrors && sourceMapErrors.length) {
        errors.push.apply(errors, sourceMapErrors);
      }
      callback(errors);
    });
  });
}

function getSourceMap(url, callback) {
  const errors = [];
  request(url, function(error, response, body) {
    if (error) {
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
      errors.push(new InvalidSourceMapFormatError(url, err))
      return void callback(errors);
    }

    callback(errors);
  });
}

module.exports = getSourceFile;
