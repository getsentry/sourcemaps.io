/**
 * Generate source file/source map fixture scripts used in tests.
 * See test/test.js.
 */
const fs = require('fs');
const path = require('path');
const UglifyJS = require('uglify-js');

const fixtureDir = path.join(__dirname, 'test', 'fixtures');
const buildDir = path.join(fixtureDir, 'build');
const source = fs.readFileSync(path.join(fixtureDir, 'add.js'), 'utf8');

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
function replaceSourceMappingURL(source, sourceMappingURL) {
  const lines = source.split('\n');
  lines.pop();
  lines.push('//# sourceMappingURL=' + sourceMappingURL);
  return lines.join('\n');
}

//------------------------------------------------------
// case 1: the good case™
//
// end-to-end source map example with properly mapped
// tokens and sourcesContent
//------------------------------------------------------
let output = UglifyJS.minify(source, {
  sourceMap: {
    filename: 'add.dist.js',
    url: 'add.dist.js.map',
    includeSources: true
  }
});

fs.writeFileSync(path.join(buildDir, 'add.dist.js'), output.code);
fs.writeFileSync(path.join(buildDir, 'add.dist.js.map'), output.map);

//------------------------------------------------------
// case 2: fuzzed input sourcesContent
//
// adds a garbage copyright notice to each input sourcesContent,
// which will cause token mappings to be incorrect
//------------------------------------------------------
let sourceMap = JSON.parse(output.map);
sourceMap.sourcesContent = sourceMap.sourcesContent.map(source => {
  return '/**\n * Copyright 2017 Weyland-Yutani\n * All rights reserved\n */\n' + source;
});

output.code = replaceSourceMappingURL(output.code, 'add.fuzzinput.js.map');

fs.writeFileSync(path.join(buildDir, 'add.fuzzinput.js'), output.code);
fs.writeFileSync(path.join(buildDir, 'add.fuzzinput.js.map'), JSON.stringify(sourceMap));
