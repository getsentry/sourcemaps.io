import React from 'react';
import ReactDOM from 'react-dom';
import Raven from 'raven-js';

import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';

if (process.env.REACT_APP_SENTRY_DSN) {
  Raven.config(process.env.REACT_APP_SENTRY_DSN, {
      release: process.env.REACT_APP_GIT_SHA
  }).install();
}

ReactDOM.render(<App />, document.getElementById('root'));
registerServiceWorker();
