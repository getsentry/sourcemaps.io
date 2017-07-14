.PHONY: test test-install server build deploy

GCLOUD_FN_NAME=validateSourceFile
GCLOUD_REGION=us-central1
REACT_APP_VALIDATE_URL=https://${GCLOUD_REGION}-${GCLOUD_PROJECT}.cloudfunctions.net/${GCLOUD_FN_NAME}

# Run unit tests
test: test-install
	npm test --prefix ./server

test-install:
	npm install --prefix ./server

# Launch a local development server for working on the
# React www app (points at deployed/production validation fn)
server:
	REACT_APP_VALIDATE_URL=${REACT_APP_VALIDATE_URL} \
		npm run start --prefix ./client

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
# for deployment (see deploy)
build-www:
	npm install --prefix ./client
	REACT_APP_VALIDATE_URL=${REACT_APP_VALIDATE_URL} \
		npm run build --prefix ./client

deploy-config:
	gcloud config set project ${GCLOUD_PROJECT}

# Deploy static website
deploy-www: build-www
	gsutil rsync -R client/build gs://${GCLOUD_WWW_BUCKET}
	gsutil acl ch -u AllUsers:R gs://${GCLOUD_WWW_BUCKET}

# Deploy server[less] code
deploy-server:
	echo '{"PROJECT":"${GCLOUD_PROJECT}","STORAGE_BUCKET":"${GCLOUD_DATA_BUCKET}"}' > server/config.json
	gcloud beta functions deploy ${GCLOUD_FN_NAME} --local-path server \
		--stage-bucket ${GCLOUD_APP_BUCKET} --trigger-http
	gsutil cors set server/cors.json gs://${GCLOUD_DATA_BUCKET}

# Deploy all
deploy: build-www deploy-config deploy-server deploy-www
