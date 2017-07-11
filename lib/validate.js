const request = require('request');
const urljoin = require('url-join');

const {
  SourceMapNotFoundError,
  UnableToFetchMinifiedError,
  UnableToFetchSourceMapError,
  InvalidSourceMapFormatError
} = require('./errors');

function resolveSourceMappingURL(sourceUrl, sourceMappingURL) {
  const urlBase = sourceUrl.replace(/\/[^\/]+$/, '');
  return sourceMappingURL.startsWith('http') 
    ? sourceMappingURL
    : urljoin(urlBase, sourceMappingURL);
}

function getSourceFile(url, callback) {
  const errors = [];
  request(url, function (error, response, body) {
    if (error) {
      console.log(error);
      return;
    }

    if (response && response.statusCode !== 200) {
      errors.push(new UnableToFetchMinifiedError(url));
      return void callback(errors);
    }

    const lines = body.split(/\n/);
    if (!lines.length > 0) {
      console.log('no lines');
      return;
    }

    const last = lines[lines.length - 1];
    const match = last.match(/sourceMappingURL\=(\S+)$/)
    if (!match) {
      errors.push(new SourceMapNotFoundError(url))
      return void callback(errors);
    }

    const sourceMappingURL = match[1];
    const resolvedSourceMappingURL = resolveSourceMappingURL(url, sourceMappingURL)

    getSourceMap(resolvedSourceMappingURL, function (sourceMapErrors) {
      if (sourceMapErrors && sourceMapErrors.length) {
        errors.push.apply(errors, sourceMapErrors);
      }
      callback(errors)
    });
  });
}

function getSourceMap(url, callback) {
  const errors = [];
  request(url, function (error, response, body) {
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
      errors.push(new InvalidSourceMapFormatError(url));
      return void callback(errors);
    }

    callback(errors);
  });
}

module.exports = getSourceFile;