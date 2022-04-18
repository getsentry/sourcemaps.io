import React from 'react';
import {render, waitFor, screen, waitForElementToBeRemoved} from '@testing-library/react';
import fetchMock from 'fetch-mock';

import Report from '../Report';

const exampleReport = {
  errors: [],
  warnings: [],
  sources: [],
  sourceMap: '',
  url: ''
};

it('should fetch the report URL corresponding to the route param', (done) => {
  fetchMock.get('undefined/report.json', () => {
    fetchMock.restore();
    return JSON.stringify(exampleReport);
  });

  const {container} = render(<Report match={{params: { report: 'report.json' }}}/>);
  waitFor(() => screen.getByTestId('loader')).then(() => {
    waitForElementToBeRemoved(() => screen.getByTestId('loader')).then(() => {
      expect(container.firstChild).toMatchSnapshot();
      done();
    });
  });
});
