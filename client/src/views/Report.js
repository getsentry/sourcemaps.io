import React, {Component} from 'react';
import ReactTooltip from 'react-tooltip';
import PropTypes from 'prop-types';
import queryString from 'query-string';

import Loader from './Loader';

/**
 * Error entry for token/mapping errors (includes source code context)
 */
function BadTokenEntry(props, index) {
  const {source, expected, token, mapping} = props;
  const {
    originalContext,
    originalLine,
    originalColumn,
    generatedColumn,
    generatedLine
  } = mapping;
  return (
    <li className="entry" key={index}>
      <ReactTooltip id={`tt_${index}`} effect="solid">
        Generated location: L{generatedLine}
        {':'}
        {generatedColumn}
      </ReactTooltip>
      <p>
        In <code>{source}</code>
        {':'} Expected <code>{expected}</code> but got <code>{token}</code> at{' '}
        <span data-tip data-for={`tt_${index}`}>
          {`L${originalLine}:${originalColumn}`}
        </span>
      </p>
      <div>
        <pre className="code">
          <ol start={originalContext[0][0]}>
            {originalContext.map(([line, ctx]) =>
              <li
                className={line === originalLine ? 'line line-active' : 'line'}
                key={line}>
                <span>
                  {ctx}
                </span>
              </li>
            )}
          </ol>
        </pre>
      </div>
    </li>
  );
}

BadTokenEntry.propTypes = {
  source: PropTypes.string.isRequired,
  expected: PropTypes.string.isRequired,
  token: PropTypes.string.isRequired,
  mapping: PropTypes.object.isRequired
};

/**
 * Generic error entry
 */
function Entry(props, index) {
  const {name, message, resolutions} = props;

  const htmlMessage = (message || '').replace(/(https?\S+)/g, '<a href="$1">$1</a>');
  return (
    <li className="entry" key={index}>
      <h4>
        {name}
      </h4>
      {message && <p dangerouslySetInnerHTML={{__html: htmlMessage}} />}
      {resolutions &&
        resolutions.length > 0 &&
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
      ? <div className="alert alert-success">
        <strong>Bingo.</strong> Everything looks good.
      </div>
      : <div className="alert alert-danger">
        <strong>Ouch.</strong> Check the errors below.
      </div>;
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
                  <h4>
                    {report.url}
                  </h4>
                </a>
              </p>
              <h3>
                Sources{' '}
                <span className="badge badge-success">{report.sources.length}</span>
              </h3>
              <ul>
                {report.sources.map(src =>
                  <li key={src}>
                    <a href={src}>
                      {src}
                    </a>
                  </li>
                )}
              </ul>
              <h3>
                Errors {report.errors.length > 0
                  ? <span className="badge" style={{background: '#b94a48'}}>{report.errors.length}</span>
                  : <span className="badge">0</span>
                }
              </h3>
              <ul>
                {report.errors.map((err, index) => {
                  return ['BadTokenError', 'BadColumnError'].includes(err.name) ? BadTokenEntry(err, index) : Entry(err, index);
                })}
              </ul>
              <h3>
                Warnings {report.warnings.length > 0
                  ? <span className="badge" style={{background: '#f89406'}}>{report.warnings.length}</span>
                  : <span className="badge">0</span>
                }
              </h3>
              <ul>
                {report.warnings.map((err, index) => {
                  return ['BadTokenError', 'BadColumnError'].includes(err.name) ? BadTokenEntry(err, index) : Entry(err, index);
                })}
              </ul>
            </div>}
      </div>;
  }
}

Report.propTypes = {
  location: PropTypes.object
};

export default Report;
