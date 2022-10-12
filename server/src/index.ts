import path from 'path';
import { Request, Response } from 'express';
import { Storage } from '@google-cloud/storage';
import * as Sentry from '@sentry/node';
import '@sentry/tracing';
import { ProfilingIntegration } from '@sentry/profiling-node';

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

if (!config.SENTRY_DSN) {
  throw new Error('SENTRY_DSN was not set in config.json');
}

Sentry.init({
  dsn: config.SENTRY_DSN,
  tracesSampleRate: 1,
  // @ts-expect-error this is not part of the node options lib yet
  profilesSampleRate: 1,
  integrations: [new ProfilingIntegration()]
});

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
  const transaction = Sentry.startTransaction({
    name: 'validateGeneratedFile'
  });
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST');

  const url = req.query.url;
  if (!url) {
    res.status(500).send('URL not specified');
    if (transaction) transaction.finish();
    return;
  }

  if (typeof url !== 'string') {
    throw new TypeError('url is not a string');
  }

  if (transaction) {
    transaction.setTag('sourcemap_url', url);
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
    stream.on('error', async err => {
      res.status(500).send(err.message);
      Sentry.captureException(err);
      if (transaction) transaction.finish();
      await Sentry.flush(5000);
    });
    stream.on('finish', async () => {
      res.status(200).send(encodeURIComponent(objectName));
      if (transaction) transaction.finish();
      await Sentry.flush(5000);
    });

    stream.end(JSON.stringify(report));
  });
}
