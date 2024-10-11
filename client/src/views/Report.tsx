import {Tooltip as ReactTooltip} from 'react-tooltip';

import Loader from './Loader';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const STORAGE_URL = import.meta.env.REACT_APP_STORAGE_URL;

type LineOrColumn = number;
interface ErrorType {
  name: string,
  message: string,
  resolutions?: string[],
  source?: string,
  column?: number,
  line?: number,
  expected?: string,
  token?: string,
  mapping: {
    originalContext: [LineOrColumn, string][],
    originalLine: LineOrColumn,
    originalColumn: LineOrColumn,
    generatedColumn: LineOrColumn,
    generatedLine: LineOrColumn,
  },
}

interface Report {
  url: string;
  errors: ErrorType[];
  warnings: ErrorType[];
  sources: string[]
  sourceMap?: string;
}


interface EntryProps {
  error: ErrorType,
  index: number
};

/**
 * Error entry for token/mapping errors (includes source code context)
 */
function BadTokenEntry({error: {source, expected, token, mapping}, index}: EntryProps) {
  const {
    originalContext,
    originalLine,
    originalColumn,
    generatedColumn,
    generatedLine
  } = mapping;
  return (
    <li className="entry" key={index}>
      <ReactTooltip id={`tt_${index}`}>
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
            {originalContext.map(([line, ctx]) => (
              <li
                className={line === originalLine ? 'line line-active' : 'line'}
                key={line}
              >
                <span>{ctx}</span>
              </li>
            ))}
          </ol>
        </pre>
      </div>
    </li>
  );
}

/**
 * Generic error entry
 */
function Entry({error, index}: EntryProps) {
  const { name, message, resolutions } = error;

  const htmlMessage = (message || '').replace(
    /(https?\S+)/g,
    '<a href="$1">$1</a>'
  );
  return (
    <li className="entry" key={index}>
      <h4>{name}</h4>
      {message && <p className="sr-block" dangerouslySetInnerHTML={{ __html: htmlMessage }} />}
      {resolutions && resolutions.length > 0 && (
        <div>
          <h5>Resolutions</h5>
          <ul>
            {resolutions.map((res, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: res }} />
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}


function Alert({report}: {report: Report}) {
  if (!report) {
    return null;
  }

  if (report.errors.length === 0 && report.warnings.length === 0) {
    return (
      <div className="alert alert-success">
        <strong>Bingo.</strong> Everything looks good.
      </div>
    );
  } if (report.errors.length > 0) {
    return (
      <div className="alert alert-danger">
        <strong>Ouch.</strong> Check the errors below.
      </div>
    );
  }
  return (
    <div className="alert alert-warning">
      <strong>Hmm.</strong> Successful but with warnings.
    </div>
  );
}


// Report.propTypes = {
//   location: PropTypes.object,
//   match: PropTypes.object
// };

export default function Report() {
  const {reportName} = useParams();
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    const reportUrl = `${STORAGE_URL}/${encodeURIComponent(reportName ?? '')}`;
    fetch(reportUrl).then(response => response.json()).then(setReport);
  }, [report, reportName]);
  
  if (!report) {
    return <Loader />;
  };

  return (
    <div>
      <Alert report={report} />
      <h2>
        Report for <a href={report.url} className="sr-mask">{report.url.split('/').pop()}</a>
      </h2>
      <div>
        <h3>URL</h3>
        <ul>
          <li>
            <a href={report.url} className="sr-mask">{report.url}</a>
          </li>
        </ul>
        {report.sourceMap && (
          <div>
            <h3>Source Map</h3>
            <ul>
              <li>
                <a href={report.sourceMap} className="sr-mask">{report.sourceMap}</a>
              </li>
            </ul>
          </div>
        )}
        {report.sources.length > 0 && (
          <div>
            <h3>
              Sources{' '}
              <span className="badge badge-success">
                {report.sources.length}
              </span>
            </h3>
            <ul>
              {report.sources.map(src => (
                <li key={src}>
                  <a href={src} className="sr-mask">{src}</a>
                </li>
              ))}
            </ul>
          </div>
        )}
        <h3>
          Errors{' '}
          {report.errors.length > 0 ? (
            <span className="badge" style={{ background: '#b94a48' }}>
              {report.errors.length}
            </span>
          ) : (
            <span className="badge">0</span>
          )}
        </h3>
        <ul>
          {report.errors.map((error, index) => {
            return ['BadTokenError', 'BadColumnError'].includes(error.name)
              ? <BadTokenEntry error={error} index={index} />
              : <Entry error={error} index={index} />;
          })}
        </ul>
        <h3>
          Warnings{' '}
          {report.warnings.length > 0 ? (
            <span className="badge" style={{ background: '#f89406' }}>
              {report.warnings.length}
            </span>
          ) : (
            <span className="badge">0</span>
          )}
        </h3>
        <ul>
          {report.warnings.map((error, index) => {
            return ['BadTokenError', 'BadColumnError'].includes(error.name)
              ? <BadTokenEntry error={error} index={index} />
              : <Entry error={error} index={index} />;
          })}
        </ul>
      </div>
    </div>
  );
}
