import path from 'path';
import { Request, Response } from 'express';
import { Storage } from '@google-cloud/storage';
import * as Sentry from '@sentry/node';

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

if (config.SENTRY_DSN) {
  Sentry.init({ dsn: config.SENTRY_DSN, tracesSampleRate: 1 });
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
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST');

  const url = req.query.url;
  if (!url) {
    res.status(500).send('URL not specified');
  }

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
    stream.on('error', err => {
      res.status(500).send(err.message);
    });
    stream.on('finish', () => {
      res.status(200).send(encodeURIComponent(objectName));
    });

    stream.end(JSON.stringify(report));
  });
}
