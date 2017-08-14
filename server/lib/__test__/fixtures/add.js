/*eslint-disable*/
// Input source file used to generate multiple different dist/map pairings.
// See ../../webpack.config.js.

const someMap = {
  1: 1,
  2: 2
};

/**
 * Usage:
 *   add(1, 2, 3) // returns 6
 */
module.exports = function add() {
  return [].slice(arguments).reduce((sum, x) => {
    return sum + x;
  }, 0);
};
