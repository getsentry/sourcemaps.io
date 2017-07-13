import React, {Component} from 'react';
import {BrowserRouter as Router, Route} from 'react-router-dom';

import './App.css';

import Home from './views/Home';
import Report from './views/Report';

class App extends Component {
  render() {
    return (
      <Router>
        <div>
          <Route exact path="/" component={Home} />
          <Route path="/report" component={Report} />
        </div>
      </Router>
    );
  }
}

export default App;
