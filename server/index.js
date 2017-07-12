const fs = require('fs');
const validate = require('./lib/validate');
const Storage =  require('@google-cloud/storage');

let config = null;
try {
  // NOTE: this must use `require` (vs fs.readFile[Sync]) or gcloud
  //       won't transfer config.json as part of a function deployment
  config = require('./config.json');
} catch (e) {
  throw new Error('Missing config.json; see README');
}

const storage = Storage({
  projectId: config.PROJECT
});

/**
 * Cloud Function.
 *
 * @param {object} event The Cloud Functions event.
 * @param {function} The callback function.
 */
exports.validateSourceFile = function (req, res) {
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'POST')

  const url = req.query.url;
  if (!url) {
    res.status(500).send('URL not specified');
  }
  
  validate(url, function (errors) {
    if (!errors || errors.length === 0) {
      res.status(200).end();
    }

    const bucket = storage.bucket(config.STORAGE_BUCKET);

    const objectName = Date.now() + '_' + encodeURIComponent(url);
    const file = bucket.file(objectName);

    const stream = file.createWriteStream();
    stream.on('error', (err) => {
      res.status(500).send(err);
    });
    stream.on('finish', () => {
      res.status(200).send(objectName);
    });
    stream.end(JSON.stringify(errors), 'utf8');
  });
};
