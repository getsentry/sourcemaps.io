/* eslint import/no-extraneous-dependencies:0 */
/**
 * Generate source file/source map fixture scripts used in tests.
 * See test/test.js.
 */
const fs = require('fs');
const path = require('path');
const UglifyJS = require('uglify-js');

const buildDir = path.join(__dirname, 'build');
const source = fs.readFileSync(path.join(__dirname, 'add.js'), 'utf8');

try {
  fs.mkdirSync(buildDir);
} catch (e) {
  if (!e.message.startsWith('EEXIST')) {
    throw e;
  }
}

/**
 * Little utility function to replace the last line of a Uglify-minfiied
 * file with a new sourceMappingURL directive (better than re-running
 * UglifyJS for each example)
 */
function replaceSourceMappingURL(src, sourceMappingURL) {
  const lines = src.split('\n');
  lines.pop();
  lines.push(`//# sourceMappingURL=${sourceMappingURL}`);
  return lines.join('\n');
}

//------------------------------------------------------
// the good case™
//
// end-to-end source map example with properly mapped
// tokens and sourcesContent
//------------------------------------------------------
let output = UglifyJS.minify({
  'add.js': source
}, {
  sourceMap: {
    filename: 'add.inlineSources.js',
    url: 'add.inlineSources.js.map',
    includeSources: true
  }
});

fs.writeFileSync(path.join(buildDir, 'add.inlineSources.js'), output.code);
fs.writeFileSync(path.join(buildDir, 'add.inlineSources.js.map'), output.map);

//------------------------------------------------------
// fuzzed lines sourcesContent
//
// adds a garbage copyright notice to each input sourcesContent,
// which will cause token mappings to be incorrect
//------------------------------------------------------
const fuzzedLineSourceMap = JSON.parse(output.map);
fuzzedLineSourceMap.sourcesContent = fuzzedLineSourceMap.sourcesContent.map(src => `/**\n * Copyright 2017 Weyland-Yutani\n * All rights reserved\n */\n${src}`);

output.code = replaceSourceMappingURL(output.code, 'add.fuzzLines.js.map');

fs.writeFileSync(path.join(buildDir, 'add.fuzzLines.js'), output.code);
fs.writeFileSync(path.join(buildDir, 'add.fuzzLines.js.map'), JSON.stringify(fuzzedLineSourceMap));

//------------------------------------------------------
// fuzzed columns sourcesContent
//
// adds a garbage copyright notice to each input sourcesContent,
// which will cause token mappings to be incorrect
//------------------------------------------------------
const fuzzedColumnSourceMap = JSON.parse(output.map);
fuzzedColumnSourceMap.sourcesContent = fuzzedColumnSourceMap.sourcesContent.map((src) => {
  const lines = src.split('\n');
  const fuzzedLines = lines.map((line) => { return `     ${line}`; });
  return fuzzedLines.join('\n');
});

output.code = replaceSourceMappingURL(output.code, 'add.fuzzColumns.js.map');

fs.writeFileSync(path.join(buildDir, 'add.fuzzColumns.js'), output.code);
fs.writeFileSync(path.join(buildDir, 'add.fuzzColumns.js.map'), JSON.stringify(fuzzedColumnSourceMap));


//------------------------------------------------------
// no included sources
//------------------------------------------------------
output = UglifyJS.minify({
  'add.js': source
}, {
  sourceMap: {
    filename: 'add.externals.js',
    url: 'add.externals.js.map',
    includeSources: false
  }
});

fs.writeFileSync(path.join(buildDir, 'add.externals.js'), output.code);
fs.writeFileSync(path.join(buildDir, 'add.externals.js.map'), output.map);
fs.writeFileSync(path.join(buildDir, 'add.js'), source);

//------------------------------------------------------
// inline source map (data-uri)
//------------------------------------------------------
output = UglifyJS.minify({
  'add.js': source
}, {
  sourceMap: {
    filename: 'add.dataUri.js',
    url: 'add.dataUri.js.map',
    includeSources: true,
    content: 'inline',
    url: 'inline'
  }
});

fs.writeFileSync(path.join(buildDir, 'add.dataUri.js'), output.code);
fs.writeFileSync(path.join(buildDir, 'add.dataUri.js.map'), output.map);
