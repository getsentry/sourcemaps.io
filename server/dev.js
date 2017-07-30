/**
 * Local test server for development
 */
const express = require('express');
const {validateSourceFile} = require('.');

const PORT = 3001;

const app = express();

app.post('/validateSourceFile', validateSourceFile);

app.listen(PORT, () => {
  console.log(`sourcemaps.io local development server running on ${PORT}`);
});
