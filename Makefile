test: test-install
	npm test --prefix ./server

test-install:
	npm install --prefix ./server

# Required environment variables
#
# GCLOUD_PROJECT - project id
# GCLOUD_APP_BUCKET - google cloud functions staging bucket id
# GCLOUD_DATA_BUCKET - report storage (JSON) bucket id
# GCLOUD_WWW_BUCKET - static website deployment bucket id

GCLOUD_FN_NAME=validateSourceFile
GCLOUD_REGION=us-central1

build:
	npm install --prefix ./client
	REACT_APP_VALIDATE_URL="https://${GCLOUD_REGION}-${GCLOUD_PROJECT}.cloudfunctions.net/${GCLOUD_FN_NAME}" \
		npm run build --prefix ./client

deploy: build
	echo '{"PROJECT":"${GCLOUD_PROJECT}","STORAGE_BUCKET":"${GCLOUD_DATA_BUCKET}"}' > server/config.json
	gcloud config set project ${GCLOUD_PROJECT}
	gcloud beta functions deploy ${GCLOUD_FN_NAME} --local-path server \
		--stage-bucket ${GCLOUD_APP_BUCKET} --trigger-http
	gsutil cors set server/cors.json gs://${GCLOUD_DATA_BUCKET}
	gsutil rsync -R client/build gs://${GCLOUD_WWW_BUCKET}
