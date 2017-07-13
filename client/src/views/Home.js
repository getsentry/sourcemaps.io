import React, {Component} from 'react';
import {withRouter} from 'react-router-dom';
import Spinner from 'react-spinkit';

import Loader from './Loader';

const VALIDATE_URL = process.env.REACT_APP_VALIDATE_URL;

const TARGET_URL_PLACEHOLDER = 'http://code.jquery.com/jquery-1.9.1.min.js';

function Example(props) {
  let {children, url} = props;
  return (
    <li>
      <a href={url}>
        {children}
      </a>
    </li>
  );
}
class Home extends Component {
  constructor() {
    super();
    this.state = {
      targetUrl: '',
      loading: false
    };
  }

  handleSubmit(evt) {
    const url = this.state.targetUrl || TARGET_URL_PLACEHOLDER;
    const {history} = this.props;

    this.setState({loading: true});

    evt.preventDefault();
    fetch(`${VALIDATE_URL}?url=${encodeURIComponent(url)}`, {
      method: 'POST'
    }).then(response => {
      response.text().then(reportUrl => {
        history.push(`/report?reportUrl=${encodeURIComponent(reportUrl)}`);
      });
    });
  }
  render() {
    return this.state.loading
      ? <Loader />
      : <div>
          <div className="row">
            <form action="/validate" onSubmit={evt => this.handleSubmit(evt)}>
              <div className="col-md-10 form-group">
                <input
                  type="text"
                  className="form-control"
                  name="url"
                  value={this.state.targetUrl}
                  onChange={evt => this.setState({targetUrl: evt.target.value})}
                  placeholder={TARGET_URL_PLACEHOLDER}
                />
              </div>
              <div className="col-md-2">
                <button className="btn btn-default">Validate</button>
              </div>
            </form>
          </div>
          <h2>Examples</h2>
          <ul>
            <Example url="/validate?url=http%3A%2F%2Fcode.jquery.com%2Fjquery-1.9.1.min.js">
              jQuery
            </Example>
            <li>
              <a href="/validate?url=http%3A%2F%2Fdocumentcloud.github.io%2Fbackbone%2Fbackbone-min.js">
                Backbone.js
              </a>
            </li>
            <li>
              <a href="/validate?url=http%3A%2F%2Fcdn.ravenjs.com%2F1.1.0%2Fraven.min.js">
                Raven.js
              </a>
            </li>
            <li>
              <a href="/validate?url=http%3A%2F%2Fgetsentry-cdn.s3.amazonaws.com%2Ftest%2Fraven.min.js">
                Raven.js (with closure compiler)
              </a>
            </li>
          </ul>
        </div>;
  }
}

export default withRouter(Home);
