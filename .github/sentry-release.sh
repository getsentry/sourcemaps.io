#!/bin/bash

SOURCEMAPSIO_REPO=getsentry/sourcemaps.io

if [ "${SENTRY_AUTH_TOKEN}" != "" ]; then
    SENTRY_AUTH_TOKEN_PUBLIC="<hidden>"
fi

if [ -z "${GITHUB_SHA}" ]; then
    GITHUB_SHA=$(git rev-parse HEAD)
fi

echo "SENTRY_ORG: ${SENTRY_ORG}"
echo "SENTRY_AUTH_TOKEN: ${SENTRY_AUTH_TOKEN_PUBLIC}"
echo "SENTRY_CLIENT_PROJECT: ${SENTRY_CLIENT_PROJECT}"
echo "SOURCEMAPSIO_REPO: ${SOURCEMAPSIO_REPO}"
echo "GITHUB_SHA: ${GITHUB_SHA}"

curl https://sentry.io/api/0/organizations/${SENTRY_ORG}/releases/ \
  -X POST \
  -H "Authorization: Bearer ${SENTRY_AUTH_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d "
{
    \"version\": \"${GITHUB_SHA}\",
    \"refs\": [{
        \"repository\":\"${SOURCEMAPSIO_REPO}\",
        \"commit\":\"${GITHUB_SHA}\"
    }],
    \"projects\":[\"${SENTRY_CLIENT_PROJECT}\"]
}"
