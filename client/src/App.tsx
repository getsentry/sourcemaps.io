import {BrowserRouter, Route, Routes} from 'react-router-dom';

import './App.css'

import Home from './views/Home';
import Report from './views/Report';
import NotFound from './views/NotFound';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/report/:reportName" element={<Report />} />
        <Route element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
