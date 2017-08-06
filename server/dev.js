/**
 * Local test server for development
 */
const express = require('express');
const path = require('path');
const {validateSourceFile} = require('.');

const PORT = 3001;

const app = express();

app.post('/validateSourceFile', validateSourceFile);


app.use('/fixtures', express.static(path.join('test', 'fixtures', 'build')));

app.listen(PORT, () => {
  console.log(`sourcemaps.io local development server running on ${PORT}`);
});
