import { validateGeneratedFile as fnValidateGeneratedFile } from '..';
import { Response } from 'express';
import { stringify } from 'querystring';

const mockResponse = () => {
  const res: { status?: Function; set?: Function; send?: Function } = {};
  res.status = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

describe('fnValidateGeneratedFile', () => {
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
