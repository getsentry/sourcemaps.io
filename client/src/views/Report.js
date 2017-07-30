import React, {Component} from 'react';
import queryString from 'query-string';

import Loader from './Loader';

function Entry(props) {
  const {name, message, resolutions} = props;

  const htmlMessage = message.replace(/(https?\S+)/g, '<a href="$1">$1</a>');
  return (
    <li key={name}>
      <h4>
        {name}
      </h4>
      <p dangerouslySetInnerHTML={{__html: htmlMessage}} />
      {resolutions &&
        <div>
          <h5>Resolutions</h5>
          <ul>
            {resolutions.map((res, i) =>
              <li key={i} dangerouslySetInnerHTML={{__html: res}} />
            )}
          </ul>
        </div>}
    </li>
  );
}

Entry.propTypes = {
  name: React.propTypes.string,
  message: React.propTypes.string,
  resolutions: React.propTypes.array
};

class Report extends Component {
  constructor(props) {
    super(props);
    const {reportUrl} = queryString.parse(props.location.search);
    this.state = {reportUrl, report: null};
  }

  componentDidMount() {
    fetch(this.state.reportUrl).then((response) => {
      response.json().then((report) => {
        this.setState({report});
      });
    });
  }

  render() {
    const {report} = this.state;
    return !report
      ? <Loader />
      : <div>
        <h1>Report</h1>
        {report &&
            <div>
              <p>
                <a href={report.url}>{report.url}</a>
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
                {report.errors.length ? report.errors.map(Entry) : <span>No errors</span>}
              </ul>
              <h3>Warnings</h3>
              <ul>
                {report.warnings.length ? report.warnings.map(Entry) : <span>No warnings</span>}
              </ul>
            </div>}
      </div>;
  }
}

Report.propTypes = {
  location: React.propTypes.object
};

export default Report;
