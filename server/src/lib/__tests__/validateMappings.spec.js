const validateMappings = require('../validateMappings').default;

describe('validateMappings', () => {
  it('should stop at 100 errors', () => {
    const sourceMapConsumer = {
      eachMapping(callback) {
        // mock source map consumer with 200 entries;
        // each one should fail
        for (let i = 0; i < 200; i++) {
          callback({
            source: 'app.js',
            name: 'foo',
            originalLine: 10,
            originalColumn: 10
          });
        }
      },
      sourceContentFor() {
        return 'lol();';
      }
    };
    // assert `validateMappings` stopped at 100 entries
    const report = validateMappings(sourceMapConsumer);
    expect(report.errors).toHaveLength(100);
  });
});
