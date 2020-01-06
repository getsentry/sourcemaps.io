/**
 * Local test server for development
 */
const express = require('express');
const path = require('path');
const { validateGeneratedFile } = require('.');

const PORT = 3001;

const app = express();

app.post('/validateGeneratedFile', validateGeneratedFile);

app.use(
  '/fixtures',
  express.static(path.join('lib', '__test__', 'fixtures', 'build'))
);

app.listen(PORT, () => {
  console.log(`sourcemaps.io local development server running on ${PORT}`);
});
