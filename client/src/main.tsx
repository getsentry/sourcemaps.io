import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';

import './index.css';
import App from './App.tsx';
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType
} from 'react-router-dom';

Sentry.init({
  debug: true,
  dsn:
    'https://449ac547402bc2b571002ecbe815fc4b@o1.ingest.us.sentry.io/4508692884357121',
  release: import.meta.env.REACT_APP_GIT_SHA,
  replaysSessionSampleRate: 1.0,
  tracesSampleRate: 1.0,
  integrations: [
    Sentry.reactRouterV6BrowserTracingIntegration({
      useEffect,
      useLocation,
      useNavigationType,
      createRoutesFromChildren,
      matchRoutes
    }),
    Sentry.replayIntegration(),
    Sentry.feedbackIntegration({
      colorScheme: 'light',
      isNameRequired: false,
      isEmailRequired: false
    })
  ],
  enabled: !import.meta.env.DEV
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      registration.unregister();
    });
  });
}
