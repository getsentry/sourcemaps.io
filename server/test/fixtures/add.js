// Input source file used to generate multiple different dist/map pairings.
// See ../../webpack.config.js.

/**
 * Usage:
 *   add(1, 2, 3) // returns 6
 */
export function add(...args) {
  return args.reduce((sum, x) => {
    return sum + x;
  }, 0);
};