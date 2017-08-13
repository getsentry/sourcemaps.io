.PHONY: echo-exports test test-install client-server backend-server build-www deploy-config deploy-www deploy-data deploy-server deploy

# default to sourcemaps.io production values
#
GCLOUD_FN_NAME=validateGeneratedFile
GCLOUD_REGION=us-central1
GCLOUD_VALIDATE_URL=https://${GCLOUD_REGION}-${GCLOUD_PROJECT}.cloudfunctions.net/${GCLOUD_FN_NAME}
GCLOUD_STORAGE_URL=https://storage.googleapis.com/${GCLOUD_DATA_BUCKET}
LOCAL_VALIDATE_URL=http://127.0.0.1:3001/${GCLOUD_FN_NAME}

echo-exports:
	@echo "GCLOUD_PROJECT: ${GCLOUD_PROJECT}"
	@echo "GCLOUD_REGION: ${GCLOUD_REGION}"
	@echo "GCLOUD_FN_NAME: ${GCLOUD_FN_NAME}"
	@echo "GCLOUD_APP_BUCKET: ${GCLOUD_APP_BUCKET}"
	@echo "GCLOUD_DATA_BUCKET: ${GCLOUD_DATA_BUCKET}"
	@echo "GCLOUD_WWW_BUCKET: ${GCLOUD_WWW_BUCKET}"

# Run unit tests
test: test-install
	node_modules/.bin/eslint server client
	npm test --prefix ./server

test-install: echo-exports
	npm install
	npm install --prefix ./server
	npm install --prefix ./client

# Launch a local development server for working on the
# React www app (points at deployed/production validation fn)
client-server: test-install
	REACT_APP_VALIDATE_URL=${LOCAL_VALIDATE_URL} REACT_APP_STORAGE_URL=${GCLOUD_STORAGE_URL} \
		npm run start --prefix ./client

backend-server: test-install deploy-config
	npm run start --prefix ./server

#------------------------------------------------------------------
# Deploy recipes (to Google Cloud Platform)
#
# NOTE: If you're doing local development, you can stop here and
#       just use the 3 commands above (test, test-install, server).
#
# Required environment variables for deployment:
#   GCLOUD_PROJECT - project id
#   GCLOUD_APP_BUCKET - google cloud functions staging bucket id
#   GCLOUD_DATA_BUCKET - report storage (JSON) bucket id
#   GCLOUD_WWW_BUCKET - static website deployment bucket id

# Create a production build of the React www app intended
# for deployment (see deploy-www)
build-www:
	npm install --prefix ./client
	REACT_APP_VALIDATE_URL=${GCLOUD_VALIDATE_URL} \
		npm run build --prefix ./client

deploy-config: echo-exports
	gcloud config set project ${GCLOUD_PROJECT}
	echo '{"PROJECT":"${GCLOUD_PROJECT}","STORAGE_BUCKET":"${GCLOUD_DATA_BUCKET}","SENTRY_DSN":"${SENTRY_DSN}"}' > server/config.json

# Deploy static website
deploy-www: deploy-config build-www
	gsutil -m rsync -R -d client/build gs://${GCLOUD_WWW_BUCKET}
	gsutil web set -e index.html gs://sourcemapsio-www
	gsutil acl ch -u AllUsers:R gs://${GCLOUD_WWW_BUCKET}

# Deploy reports (basically just set perms)
deploy-data: deploy-config
	gsutil acl ch -u AllUsers:R gs://${GCLOUD_DATA_BUCKET}

# Deploy server[less] code
deploy-server: deploy-config
	gcloud beta functions deploy ${GCLOUD_FN_NAME} --local-path server \
		--stage-bucket ${GCLOUD_APP_BUCKET} --trigger-http --verbosity debug
	gsutil cors set server/cors.json gs://${GCLOUD_DATA_BUCKET}

# Deploy all
deploy: build-www deploy-config deploy-server deploy-data deploy-www
