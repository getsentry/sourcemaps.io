#!/bin/bash

SOURCEMAPSIO_REPO=getsentry/sourcemaps.io

if [ "${SENTRY_AUTH_TOKEN}" != "" ]; then
    SENTRY_AUTH_TOKEN_PUBLIC="<hidden>"
fi

if [ -z "${TRAVIS_COMMIT}" ]; then
    TRAVIS_COMMIT=`git rev-parse HEAD`
fi

echo "SENTRY_ORG: ${SENTRY_ORG}"
echo "SENTRY_AUTH_TOKEN: ${SENTRY_AUTH_TOKEN_PUBLIC}"
echo "SENTRY_SERVER_PROJECT: ${SENTRY_SERVER_PROJECT}"
echo "SENTRY_CLIENT_PROJECT: ${SENTRY_CLIENT_PROJECT}"
echo "SOURCEMAPSIO_REPO: ${SOURCEMAPSIO_REPO}"
echo "TRAVIS_COMMIT: ${TRAVIS_COMMIT}"

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