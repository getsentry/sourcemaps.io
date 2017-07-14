test: test-install
	npm test --prefix ./server

test-install:
	npm install --prefix ./server

build:
	npm install --prefix ./client
	npm run build --prefix ./client

deploy: build
	echo '{"PROJECT":"${GCLOUD_PROJECT}","STORAGE_BUCKET":"${GCLOUD_DATA_BUCKET}"}' > config.json
	gcloud config set project ${GCLOUD_PROJECT}
	gcloud beta functions deploy validateSourceFile --stage-bucket ${GCLOUD_APP_BUCKET} --trigger-http
	gsutil cors set server/cors.json gs://$GCLOUD_DATA_BUCKET
	gsutil rsync -R client/build gs://$GCLOUD_WWW_BUCKET
