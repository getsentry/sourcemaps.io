import { RawSourceMap } from 'source-map';
import { Response } from 'request';

const urljoin = require('url-join');

/**
 * Resolves a target url relative to a given base url
 * e.g. ['https://example.com/', '/some/path'] => 'https://example.com/some/path'
 */
export function resolveUrl(baseUrl: string, targetUrl: string) {
  // Don't mess with data-uris
  if (targetUrl.startsWith('data:')) {
    return targetUrl;
  }

  const urlBase = baseUrl.replace(/\/[^/]+$/, '');

  // If the target url is already a fully qualified absolute URL,
  // return as-is
  return /^(https?|webpack|file):\/\//.test(targetUrl)
    ? targetUrl
    : urljoin(urlBase, targetUrl);
}

/**
 * Resolves a url taken from the `sources` property of a source map
 * relative to either that source map's `sourceRoot` property (if present)
 * OR failing that relative to the source map's URL
 */
export function resolveSourceMapSource(
  sourceUrl: string,
  sourceMapUrl: string,
  rawSourceMap: RawSourceMap
) {
  let resolvedUrl = sourceUrl;

  if (
    !resolvedUrl.startsWith('http') &&
    rawSourceMap.sourceRoot !== undefined
  ) {
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

/**
 * Given an HTTP response of a generated/transpiled/minified JavaScript
 * file, locate that file's source map location if present
 */
export function getSourceMapLocation(
  response: Response,
  body: string
): string | null {
  // First, look for Source Map HTTP headers
  const sourceMapHeader =
    response.headers['x-sourcemap'] || response.headers.sourcemap;

  if (sourceMapHeader)
    return Array.isArray(sourceMapHeader)
      ? sourceMapHeader[0]
      : sourceMapHeader;

  // If no headers, look for a sourceMappingURL directive on the last line
  const lines = body.split(/\n/);
  if (!lines.length) {
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
    match = line && line.match(DIRECTIVE_RE);
    if (match) return match[1];
  }

  return null;
}
