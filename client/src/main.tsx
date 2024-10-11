import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/browser';

import './index.css'
import App from './App.tsx'

if (import.meta.env.REACT_APP_SENTRY_DSN) {
  Sentry.init({
    debug: true,
    dsn: import.meta.env.REACT_APP_SENTRY_DSN,
    release: import.meta.env.REACT_APP_GIT_SHA,
    replaysSessionSampleRate: 1.0,
    tracesSampleRate: 1.0,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
      Sentry.feedbackIntegration({
        colorScheme: 'light',
        isNameRequired: false,
        isEmailRequired: false
      }),
    ]
  });
}


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)


if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      registration.unregister();
    });
  });
}
