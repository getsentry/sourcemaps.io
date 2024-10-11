import { useCallback, useState } from 'react';
import Loader from './Loader';
import { useNavigate } from 'react-router-dom';

const VALIDATE_URL = import.meta.env.REACT_APP_VALIDATE_URL;

const TARGET_URL_PLACEHOLDER = 'http://code.jquery.com/jquery-1.9.1.min.js';

interface ExampleProps {
  name: string,
  url: string,
  version: string,
  onClick: React.MouseEventHandler<HTMLAnchorElement>,
}

function Example({name, url, version, onClick}: ExampleProps) {
  return (
    <li>
      <a href={url} onClick={onClick}>
        {name} ({version})
      </a>
    </li>
  );
}

const EXAMPLES = [
  {
    name: 'Underscore.js',
    version: '1.8.3',
    url: 'http://underscorejs.org/underscore-min.js'
  },
  {
    name: 'Bootstrap.js',
    version: '3.3.7',
    url: 'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js'
  },
  {
    name: 'Raven.js',
    version: '3.17.0',
    url: 'https://cdn.ravenjs.com/3.17.0/raven.min.js'
  },
  {
    name: 'AngularJS',
    version: '1.5.6',
    url: 'https://ajax.googleapis.com/ajax/libs/angularjs/1.5.6/angular.min.js'
  }
];

export default function Home() {
  const [targetUrl, setTargetUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  
  const handleSubmit = useCallback(() => {
    const url = targetUrl || TARGET_URL_PLACEHOLDER;

    setIsLoading(true);

    fetch(`${VALIDATE_URL}?url=${encodeURIComponent(url)}`, {
      method: 'POST'
    }).then(response => {
      response.text().then(reportName => {
        navigate(`/report/${reportName}`);
      });
    });
  }, [navigate, targetUrl]);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div>
      <div className="row">
        <form action="/validate" onSubmit={(event: React.FormEvent) => {
          event.preventDefault();
          handleSubmit();
        }}>
          <div className="col-md-10 form-group">
            <input
              type="text"
              className="form-control"
              name="url"
              value={targetUrl}
              onChange={evt => setTargetUrl(evt.target.value)}
              placeholder={TARGET_URL_PLACEHOLDER}
              title="Fully qualified URL prefixed with http or https"
              pattern="https?://.+"
            />
          </div>
          <div className="col-md-2">
            <button className="btn btn-default">Validate</button>
          </div>
        </form>
      </div>
      <h2>Examples</h2>
      <ul>
        {EXAMPLES.map((example, index) => (
          <Example
            key={index}
            {...example}
            onClick={(event) => {
              event.preventDefault();

              setTargetUrl(example.url);
              handleSubmit();
            }}
          />
        ))}
      </ul>
    </div>
  );
}
