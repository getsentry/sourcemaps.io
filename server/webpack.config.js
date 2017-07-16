const path = require('path');
/**
 * webpack.config.js
 *
 * Used to generate fixture files for tests.
 */

 const outPath = path.join(__dirname, 'test', 'fixtures', 'build');

/**
 * This plugin ruins a webpack-generated source file/source map pairing
 * by inserting a comment w/ a copyright notice at the start, in such a
 * way that all the mappings are offset.
 */
function RuinFilePlugin(options) {
  this.name = options.name;
}
RuinFilePlugin.prototype.apply = function(compiler) {
  compiler.plugin('emit', (compilation, callback) => {
    const minFile = compilation.assets[this.name];
    (minFile.children || []).forEach(rawSource => {
      rawSource._value =
        '/**\n * Copyright 2017 Weyland-Yutani\n * All rights reserved\n */\n' +
        rawSource._value;
    });
    callback(null, compilation);
  });
};

const baseConfig = {
  entry: {
    add: path.join(__dirname, 'test', 'fixtures', 'add.js')
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['es2015']
          }
        }
      }
    ]
  }
};

module.exports = [
  // with "sourcesContent"
  Object.assign({}, baseConfig, {
    output: {
      path: outPath,
      filename: '[name].sources.js'
    },
    devtool: 'source-map'
  }),

  // no "sourcesContent"
  Object.assign({}, baseConfig, {
    output: {
      path: outPath,
      filename: '[name].nosources.js'
    },
    devtool: 'nosources-source-map'
  }),

  // comments inserted at head which ruin source map
  Object.assign({}, baseConfig, {
    output: {
      path: outPath,
      filename: '[name].ruined.js'
    },
    devtool: 'source-map',
    plugins: [new RuinFilePlugin({name: 'add.ruined.js'})]
  })
];
