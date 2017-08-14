import React from 'react';
import ReactDOM from 'react-dom';
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
  fetchMock.get('http://example.com/storage/report.json', () => {
    done();
    fetchMock.restore();
    return JSON.stringify(exampleReport);
  });
  const div = document.createElement('div');
  ReactDOM.render(<Report match={{params: { report: 'report.json' }}}/>, div);
});
