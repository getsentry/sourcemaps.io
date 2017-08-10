import React, {Component} from 'react';
import PropTypes from 'prop-types';
import queryString from 'query-string';

import Loader from './Loader';

function Entry(props, index) {
  const {name, message, resolutions} = props;

  const htmlMessage = (message || '').replace(/(https?\S+)/g, '<a href="$1">$1</a>');
  return (
    <li key={index}>
      <h4>
        {name}
      </h4>
      {message &&
        <p dangerouslySetInnerHTML={{__html: htmlMessage}} />
      }
      {resolutions && resolutions.length > 0 &&
        <div>
          <h5>Resolutions</h5>
          <ul>
            {resolutions.map((res, i) =>
              <li key={i} dangerouslySetInnerHTML={{__html: res}} />
            )}
          </ul>
        </div>}
      {'column' in props &&
        'line' in props &&
        <div>
          <div>
            In <code>{props.source}</code>{':'} Expected <code>{props.expected}</code> but got <code>{props.token}</code>
          </div>
          <div>
            <pre>
              <ol start={props.originalContext[0][0]}>
                {props.originalContext.map(([line, ctx]) =>
                  <li className={line === props.line ? 'active' : ''} key={line}>{ctx}</li>
                )}
              </ol>
            </pre>
          </div>
        </div>}
    </li>
  );
}

Entry.propTypes = {
  name: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
  resolutions: PropTypes.array,
  source: PropTypes.string,
  column: PropTypes.number,
  line: PropTypes.line,
  expected: PropTypes.string,
  token: PropTypes.string
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

  renderAlert() {
    const {report} = this.state;
    if (!report) return null;

    return report.errors.length === 0
      ? <div className="alert alert-success"><strong>Bingo.</strong> Everything looks good.</div>
      : <div className="alert alert-danger"><strong>Ouch.</strong> Check the errors below.</div>;
  }

  render() {
    const {report} = this.state;

    return !report
      ? <Loader />
      : <div>
        {this.renderAlert()}
        <h2>Report</h2>
        {report &&
            <div>
              <p>
                <a href={report.url}>
                  <h4>{report.url}</h4>
                </a>
              </p>
              <h3>Sources <span className="badge badge-success">{report.sources.length}</span></h3>
              <ul>
                {report.sources.map(src =>
                  <li key={src}><a href={src}>{src}</a></li>
                )}
              </ul>
              <h3>Errors <span className="badge">{report.errors.length}</span></h3>
              <ul>
                {report.errors.map(Entry)}
              </ul>
              <h3>Warnings <span className="badge">{report.warnings.length}</span></h3>
              <ul>
                {report.warnings.map(Entry)}
              </ul>
            </div>}
      </div>;
  }
}

Report.propTypes = {
  location: PropTypes.object
};

export default Report;
