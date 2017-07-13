import React, {Component} from 'react';
import {BrowserRouter as Router, Route, Link} from 'react-router-dom';
import Spinner from 'react-spinkit';

import 'bootstrap/dist/css/bootstrap.css';
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
