import React from 'react';
import ReactDOM from 'react-dom';
import * as Sentry from '@sentry/browser';

import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';

if (process.env.REACT_APP_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.REACT_APP_SENTRY_DSN,
    release: process.env.REACT_APP_GIT_SHA
  });
}

ReactDOM.render(<App />, document.getElementById('root'));
registerServiceWorker();
