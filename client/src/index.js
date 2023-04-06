import React from 'react';
import ReactDOM from 'react-dom';
import * as Sentry from '@sentry/react';

import './index.css';
import App from './App';

if (process.env.REACT_APP_SENTRY_DSN) {
  Sentry.init({
    debug: true,
    dsn: process.env.REACT_APP_SENTRY_DSN,
    release: process.env.REACT_APP_GIT_SHA,
    replaysSessionSampleRate: 1.0,
    tracesSampleRate: 1.0,
    integrations: [
      new Sentry.BrowserTracing({
        tracingOrigins: ['sourcemaps.io']
      }),
      new Sentry.Replay()
    ]
  });
}

ReactDOM.render(<App />, document.getElementById('root'));

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister();
    });
  });
}
