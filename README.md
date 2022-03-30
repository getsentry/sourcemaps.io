# sourcemaps.io [![Build Status](https://travis-ci.org/getsentry/sourcemaps.io.svg?branch=master)](https://travis-ci.org/getsentry/sourcemaps.io)

_A re-write of [sourcemap-validator](https://github.com/mattrobenolt/sourcemap-validator) using React, Node, and Google Cloud Functions._

![image](https://user-images.githubusercontent.com/2153/28230025-2d1c756e-689a-11e7-8e57-e1078820103c.png)

[sourcemaps.io](http://v2.sourcemaps.io) is a web application that takes a URL for a target transpiled/minified JavaScript file (e.g. `https://example.com/js/app.min.js`), and verifies:

* `sourceMappingURL` or `[X-]SourceMap` header is present
* Both the transpiled/minified file and source map file are reachable via HTTP
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
make client-server
```

### Run a local server for backend development

A local development server will serve the validation function for development.

```bash
make backend-server
```

**NOTE:** Right now the local server still writes JSON reports to a production Google Cloud Storage bucket. You must have the following shell variables exported (see _Deploy to Google Cloud Platform_ below).

```
export GCLOUD_PROJECT=myproject-server
export GCLOUD_DATA_BUCKET=myproject-reports
make backend-server
```

## Deploy to Google Cloud Platform

This repository is already configured to automatically deploy to https://sourcemaps.io. But for posterity, this documents how to configure your own Google Cloud deployment environment and how to use the deploy scripts.

### Configure your Project

1. Create a new project in [Google Cloud Platform](https://cloud.google.com/), e.g. `myproject`
2. Enable Cloud Functions
3. Create **3 buckets** in Cloud Storage, for:
    1. staging the **cloud function** (e.g. `myproject-server`)
    1. storing **report data** (e.g. `myproject-reports`)
    1. storing **static web content** (e.g. `myproject-web`)

NOTE: Your deployed cloud function must be configured to use [Cloud Functions Node 10 runtime](https://cloud.google.com/functions/docs/concepts/nodejs-10-runtime) (or newer).


### Install the gcloud CLI

Follow Google Cloud's instructions for [installing the gcloud CLI](https://cloud.google.com/sdk/docs/install).

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
