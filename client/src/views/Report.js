import React, {Component} from 'react';
import queryString from 'query-string';

import Loader from './Loader';

function Entry(props) {
  let {name, message, resolutions} = props;
  return (
    <li key={name}>
      <h4>
        {name}
      </h4>
      <p>
        {message}
      </p>
      {resolutions &&
        <div>
          <h5>Resolutions</h5>
          <ul>
            {resolutions.map((res, i) =>
              <li key={i}>
                {res}
              </li>
            )}
          </ul>
        </div>}
    </li>
  );
}
class Report extends Component {
  constructor(props) {
    super(props);
    const {reportUrl} = queryString.parse(props.location.search);
    this.state = {reportUrl, report: null};
  }

  componentDidMount() {
    fetch(this.state.reportUrl).then(response => {
      response.json().then(report => {
        this.setState({report});
      });
    });
  }

  render() {
    const {reportUrl, report} = this.state;
    return !report
      ? <Loader />
      : <div>
          <h1>Report</h1>
          {report &&
            <div>
              <p>
                {report.url}
              </p>
              <h3>Sources</h3>
              <ul>
                {report.sources.map(src =>
                  <li key={src}>
                    {src}
                  </li>
                )}
              </ul>
              <h3>Errors</h3>
              <ul>
                {report.errors.map(Entry)}
              </ul>
              <h3>Warnings</h3>
              {report.warnings.map(Entry)}
              <ul />
            </div>}
        </div>;
  }
}

export default Report;
