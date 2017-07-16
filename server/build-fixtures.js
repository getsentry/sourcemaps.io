const fs = require('fs');
const path = require('path');
const UglifyJS = require('uglify-js');

const fixtureDir = path.join(__dirname, 'test', 'fixtures');
const outDir = path.join(fixtureDir, 'build');
const source = fs.readFileSync(path.join(fixtureDir, 'add.js'), 'utf8');

function replaceSourceMappingURL(source, sourceMappingURL) {
  const lines = source.split('\n');
  lines.pop();
  lines.push('//# sourceMappingURL=' + sourceMappingURL);
  return lines.join('\n');
}

let output = UglifyJS.minify(source, {
  sourceMap: {
    filename: 'add.dist.js',
    url: 'add.dist.js.map',
    includeSources: true
  }
});

fs.writeFileSync(path.join(outDir, 'add.dist.js'), output.code);
fs.writeFileSync(path.join(outDir, 'add.dist.js.map'), output.map);

let sourceMap = JSON.parse(output.map);
sourceMap.sourcesContent = sourceMap.sourcesContent.map(source => {
  return '/**\n * Copyright 2017 Weyland-Yutani\n * All rights reserved\n */\n' + source;
});

output.code = replaceSourceMappingURL(output.code, 'add.fuzzinput.js.map');

fs.writeFileSync(path.join(outDir, 'add.fuzzinput.js'), output.code);
fs.writeFileSync(path.join(outDir, 'add.fuzzinput.js.map'), JSON.stringify(sourceMap));