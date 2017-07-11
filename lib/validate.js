const request = require('request');
const urljoin = require('url-join');

const {SourceMapNotFoundError} = require('./errors');

function getSourceFile(url, callback) {
  const errors = [];
  request(url, function (error, response, body) {
    if (error) {
      console.log(error);
      return;
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
      return callback(errors);
    }
    
    const urlBase = url.replace(/\/[^\/]+$/, '');
    const sourceMappingURL = urljoin(urlBase, match[1]);

    getSourceMap(sourceMappingURL, function (sourceMapErrors) {
      if (sourceMapErrors && sourceMapErrors.length) {
        errors.push(sourceMapErrors);
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
    
    callback(errors);
  });
}

module.exports = getSourceFile;