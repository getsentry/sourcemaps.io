import { BrowserRouter, Route, Routes } from 'react-router-dom';

import './App.css';

import Home from './views/Home';
import Report from './views/Report';
import NotFound from './views/NotFound';
import * as Sentry from '@sentry/react';

const SentryRoutes = Sentry.withSentryReactRouterV6Routing(Routes);

function App() {
  return (
    <BrowserRouter>
      <SentryRoutes>
        <Route path="/" element={<Home />} />
        <Route path="/report/:reportName" element={<Report />} />
        <Route element={<NotFound />} />
      </SentryRoutes>
    </BrowserRouter>
  );
}

export default App;
