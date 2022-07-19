import React from 'react';
import ReactDOM from 'react-dom';
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';
import { SentryReplay } from '@sentry/replay';

import './index.css';
import App from './App';

if (process.env.REACT_APP_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.REACT_APP_SENTRY_DSN,
    release: process.env.REACT_APP_GIT_SHA,
    integrations: [new BrowserTracing(), new SentryReplay({stickySession: true})],
    tracesSampleRate: 1.0
  });
}

ReactDOM.render(<App />, document.getElementById('root'));
