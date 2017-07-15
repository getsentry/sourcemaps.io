#!/bin/bash

SOURCEMAPSIO_REPO=getsentry/sourcemaps.io

if [ -z $TRAVIS_COMMIT ]; then
    TRAVIS_COMMIT=`git rev-parse HEAD`
fi

curl https://sentry.io/api/0/organizations/${SENTRY_ORG}/releases/ \
  -X POST \
  -H "Authorization: Bearer ${SENTRY_AUTH_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d "
{
    \"version\": \"${TRAVIS_COMMIT}\",
    \"refs\": [{
        \"repository\":\"${SOURCEMAPSIO_REPO}\",
        \"commit\":\"${TRAVIS_COMMIT}\"
    }],
    \"projects\":[\"${SENTRY_SERVER_PROJECT}\", \"${SENTRY_CLIENT_PROJECT}\"]
}"