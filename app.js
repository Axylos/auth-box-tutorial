const express = require('express');
const cors = require('cors');
const logger = require('morgan');
const bodyParser = require('body-parser');
const { handler, restrict } = require('express-box-auth');

const PORT = 3001;

const app = express();

app.use(handler);

app.get('/ping', (req, res) => {
  res.json("pong");
});

app.listen(PORT, () => console.log(`up and running on port: ${PORT}`));
