import validateMappings from '../validateMappings';
import { RawSourceMap, MappedPosition, MappingItem } from 'source-map';

describe('validateMappings', () => {
  it('should stop at 100 errors', () => {
    const sourceMapConsumer = {
      eachMapping(callback: (mapping: MappingItem) => void) {
        // mock source map consumer with 200 entries;
        // each one should fail
        for (let i = 0; i < 200; i++) {
          callback({
            source: 'app.js',
            name: 'foo',
            originalLine: 10,
            originalColumn: 10
          } as any);
        }
      },
      sourceContentFor() {
        return 'lol();';
      }
    };
    // assert `validateMappings` stopped at 100 entries
    const report = validateMappings(sourceMapConsumer as any, ['a', 'b', 'c']);
    expect(report.errors).toHaveLength(100);
  });
});
