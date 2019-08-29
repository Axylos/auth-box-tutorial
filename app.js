const express = require('express');
const cors = require('cors');
const logger = require('morgan');
const bodyParser = require('body-parser');
const { handler, restrict } = require('express-box-auth');

const PORT = 3001;

const app = express();
app.use(bodyParser.json());
app.use((req, res, next) => {
  console.log(req.body);
  next();
});

app.use(handler);


app.get('/secret', restrict, (req, res) => {
  res.json("The answer is 42");
});

app.get('/userinfo', restrict, (req, res) => {
  const email = res.locals.user.email;
  res.json({ email: email });
});

app.get('/ping', (req, res) => {
  res.json("pong");
});

app.listen(PORT, () => console.log(`up and running on port: ${PORT}`));
