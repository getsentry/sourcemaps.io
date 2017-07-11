# sourcemaps.io next

A very WIP re-write of sourcemaps.io using NodeJS and Google Cloud Functions.

Right now this is just a very unfinished "serverless" component: a single function, intended for deployment on Google Cloud Functions, that scrapes source files and associated source maps, validates them, and stores a JSON error report on Google Cloud Storage intended for later consumption.

## Run tests

```bash
npm install && npm test
```

## Configuration

Create a new file named `config.json` in the project root:

```json
{
  "PROJECT": "your-gcloud-project",
  "STORAGE_BUCKET": "reports-bucket"
}
```

## Deploying

You should already have a Google Cloud Platform account, and enabled support for Google Cloud Functions (which is in beta).

```bash
$ gcloud beta functions deploy validateSourceFile --trigger-http --stage-bucket mybucket
```

## Invoking

```bash
$ curl -X GET https://<YOUR_REGION>-<YOUR_PROJECT_ID>.cloudfunctions.net/validate?url=http://example.org/static/app.js
```
