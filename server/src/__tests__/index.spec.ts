const path = require('path');
const configPath = path.join(__dirname, '../../config.json');

jest.doMock(
  configPath,
  () => {
    return {
      SENTRY_DSN: `https://${new Array(41)
        .fill(0)
        .map((u, i) => String.fromCharCode((i % 10) + 48))
        .join('')}@12345678.ingest.sentry.io/1234567`
    };
  },
  { virtual: true }
);
import { validateGeneratedFile as fnValidateGeneratedFile } from '..';

const mockResponse = () => {
  const res: { status?: Function; set?: Function; send?: Function } = {};
  res.status = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

describe('fnValidateGeneratedFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  // This test doesn't do anything besides a basic evaluation of the code
  it('should handle a basic request without throwing an exception', () => {
    const request = {
      query: {
        url: 'http://example.com/static/app.min.js'
      }
    };
    fnValidateGeneratedFile(request as any, mockResponse() as any);
  });
});
