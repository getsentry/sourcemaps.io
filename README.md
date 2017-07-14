# sourcemaps.io [![Build Status](https://travis-ci.org/getsentry/sourcemaps.io.svg?branch=master)](https://travis-ci.org/getsentry/sourcemaps.io)

_A re-write of [sourcemap-validator](https://github.com/mattrobenolt/sourcemap-validator) using React, Node, and Google Cloud Functions._

[sourcemaps.io](https://sourcemaps.io) is a web application that takes a URL for a target transpiled/minified JavaScript file (e.g. `https://example.com/js/app.min.js`), and verifies:

* `sourceMappingURL` or `[X-]SourceMap` header is present
* Both the transiled/minified file and source map file are reachable via HTTP
* The resolved source map is valid JSON, and parses using Mozilla's [source-map](https://github.com/mozilla/source-map) library
* Lines and columns line up as expected
* ... and more, see [tests](/tests)

## Development

### Run tests

```bash
make test
```

### Run a local server for client (React) development

```bash
REACT_APP_VALIDATE_URL="https://us-central1-sourcemapsio.cloudfunctions.net/validateSourceFile" \
  make server
```

**NOTE:** Right now there is no local backend server for local development. When working in React, you will be communicating with the deployed, production server.

## Deploy to Google Cloud Platform

This repository is already configured to automatically deploy to https://sourcemaps.io. But for posterity, this documents how to configure your own Google Cloud deployment environment and how to use the deploy scripts.

### Configure your Project

1. Create a new project in [Google Cloud Platform](https://cloud.google.com/), e.g. `myproject`
2. Enable Cloud Functions (currently in beta)
3. Create **3 buckets** in Cloud Storage, for:
    1. staging the **cloud function** (e.g. `myproject-server`)
    1. storing **report data** (e.g. `myproject-reports`)
    1. storing **static web content** (e.g. `myproject-web`)

### Deploying

First authenticate with Google Cloud Platform:

```bash
gcloud auth login
```

Then initiate the deploy:

```bash
export GCLOUD_PROJECT=myproject
export GCLOUD_APP_BUCKET=myproject-server
export GCLOUD_DATA_BUCKET=myproject-reports
export GCLOUD_WWW_BUCKET=myproject-web
make deploy
```

NOTE: The deploy script will set READ permissions on `GCLOUD_DATA_BUCKET` and `GCLOUD_WWW_BUCKET`.

### Invoking the Serverless Function

The deployed serverless function is publicly accessible over HTTP. To trigger the function manually, do:

```bash
$ curl -X GET "https://${region}-${GCLOUD_PROJECT}.cloudfunctions.net/validateSourceFile?url=http://example.org/static/app.js"
```
