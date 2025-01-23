import * as Sentry from '@sentry/node';

Sentry.init({
  dsn:
    'https://59c518d943d90ba85d28f3460a5e4519@o1.ingest.us.sentry.io/4508692874199041',
  tracesSampleRate: 1,
  enabled: !process.env.SENTRY_DISABLED
});

import path from 'path';
import { Request, Response } from 'express';
import { Storage } from '@google-cloud/storage';
import _validateGeneratedFile from './lib/validateGeneratedFile';

let config: { [key: string]: string } = {};
try {
  // NOTE: this must use `require` (vs fs.readFile[Sync]) or gcloud
  //       won't transfer config.json as part of a function deployment
  /* eslint import/no-dynamic-require:0 */
  config = require(path.join(__dirname, '..', 'config.json'));
} catch (e) {
  console.error('Missing config.json; see README');
}

const storage = new Storage({
  projectId: config.PROJECT
});

/**
 * Cloud Function.
 *
 * @param {object} event The Cloud Functions event.
 * @param {function} The callback function.
 */
export function validateGeneratedFile(req: Request, res: Response) {
  return Sentry.startSpan(
    {
      name: 'validateGeneratedFile'
    },
    () => {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'POST');

      const url = req.query.url;
      if (!url) {
        res.status(500).send('URL not specified');
        return;
      }

      if (typeof url !== 'string') {
        throw new TypeError('url is not a string');
      }

      Sentry.setTag('sourcemap_url', url);

      _validateGeneratedFile(url, report => {
        const bucket = storage.bucket(config.STORAGE_BUCKET);

        // object names can't contain most symbols, so encode as a URI component
        const objectName = `${Date.now()}_${encodeURIComponent(url)}`;
        const file = bucket.file(objectName);

        const stream = file.createWriteStream({
          gzip: true,
          metadata: {
            contentType: 'text/plain; charset=utf-8'
          }
        });
        stream.on('error', async err => {
          res.status(500).send(err.message);
          Sentry.captureException(err);
        });
        stream.on('finish', async () => {
          res.status(200).send(encodeURIComponent(objectName));
        });

        stream.end(JSON.stringify(report));
      });
    }
  );
}
