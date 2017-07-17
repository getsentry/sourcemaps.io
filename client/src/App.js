import React, {Component} from 'react';
import {BrowserRouter as Router, Route, Switch} from 'react-router-dom';

import './App.css';

import Home from './views/Home';
import Report from './views/Report';
import NotFound from './views/NotFound';

class App extends Component {
  render() {
    return (
      <Router>
        <Switch>
          <Route exact path="/" component={Home} />
          <Route path="/report" component={Report} />
          <Route component={NotFound} />
        </Switch>
      </Router>
    );
  }
}

export default App;
