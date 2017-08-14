const urljoin = require('url-join');

function resolveUrl(baseUrl, targetUrl) {
  const urlBase = baseUrl.replace(/\/[^/]+$/, '');
  return /^(https?|webpack|file):\/\//.test(targetUrl)
    ? targetUrl
    : urljoin(urlBase, targetUrl);
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

module.exports = {
  resolveUrl,
  resolveSourceMapSource
};
