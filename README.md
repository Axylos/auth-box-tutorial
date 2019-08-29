# Express React Auth Shindig: The Authening

_Introduction_

In this walkthrough, we will set up a basic full-stack app with React and Express including User registration, login, and handling both public and "private" requests using `react-box-auth` and `express-box-auth`

### Overview

The strategy for auth outlined here  will be JWT token-based auth.  For both registration and login, a form will be presented to the User as a React component; upon form submission, the user information is `POST`ed to the server.  If the request is valid, the server should respond with a summary of user information as well as a `token`.  The client may then attach the token as an authentication bearer token to make subsequent "authenticated" requests to the server.

Server-side, a few routes are included for handling registration, login, as well as a _verify_ route that signals to the client if a provided token is valid.  A `restricted` middleware function is provided that will handle verifying if a token is valid as well as attaching information about the current user to `res.locals`.

The server does assume that a `users` table in a given postgres database has already been set up that includes at least an `email` and `password_digest`.

### Server Beginnings

Let's begin by setting up a simple Express server.

- run `npm init -y`
- `npm i express nodemon morgan cors body-parser pg sequelize express-box-auth dotenv`
- `touch app.js`

Inside `app.js`, write out the boilerplate for an express server:

At the top, let's require express and some middleware packages.  Below that, declare a server `PORT`

```js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const logger = require('morgan');
const bodyParser = require('body-parser');
const { handler, restrict } = require('express-box-auth');

const PORT = 3001;
```

At this point, we can initialize an express app, define one or more route handlers and then kick the server off by `listen`ing to the `PORT`:

```js
const app = express();

app.get('/ping', (req, res) => {
  res.json("pong");
});

app.listen(PORT, () => console.log(`up and running on port: ${PORT}`));
```

You can run this app with `node app.js`, or define a `dev` script in `package.json`:

```json
"dev": "nodemon app.js"
```

and then run that with `npm run dev`.

If all goes well, you should be able to start the server, and successfully make an HTTP request to `http://localhost:3001/ping` (either through Chrome, `cURL`, or Insomnia/Postman).

### A User Model / Sequelize Connection

Before moving on to the auth stuff, we need to set up `sequelize` and define a `User` model.

- run `touch models.js
- `touch resetDb.js`
- add `"resetDb": node resetDb.js"` to `package.json`

Inside `models.js`, write out the sequelize boilerplate.

```js
const Sequelize = require('sequelize');

const sequelize = new Sequelize({
  database: process.env.DB,
  dialect: 'postgres',
  define: {
    underscored: true,
  },
});

const User = sequelize.define('users', {
  email: Sequelize.STRING,
  password_digest: Sequelize.STRING,
});

module.exports = {
  sequelize,
};
```

Note that the `database` field in the configuration object passed to the Sequelize constructor is set to `process.env.DB`.  Normally, we could just hardcode this value, but extracting it to an env var will prove useful when we integrate the auth stuff in the next step.

Next, let's define a `User` model and export it:

```js
const User = sequelize.define('users', {
  email: Sequelize.STRING,
  password_digest: Sequelize.STRING,
});

module.exports = {
  sequelize,
  User,
};
```

Lastly, it's time to fill out `resetDb.js`

```js
require('dotenv').config();
const { sequelize } = require('./models');

const main = async () => {
  try {
    await sequelize.sync({ force: true });
  } catch (e) {
    console.log(e);
  } finally {
    process.exit();
  }
}

main();
```

Note the first line: `require('dotenv').config();`

This line initializes any env vars declared in a `.env` file; this is where we will place our DB name.

Let's add that now.
 
- `touch .env`
- open `.env` in your editor and add the following line: `DB=box-auth-lab`
- run `createdb box-auth-lab`
- run `npm run resetDb` and you should see a few lines reporting on the changes to the DB

Now, if you open `psql` or `postico` and connect to `box-auth-lab`, you should see the `users` table with the two columns declared above.

### Auth on Top

Now we can start adding the auth routes provided by `express-box-auth`.

To start, let's import a few things from the package at the top of `app.js`

```js
const { handler, restrict } = require('express-box-auth');
```

`handler` is a middleware router that mounts several routes to our `app` instance; `restrict` is another middleware function that authenticates a user based on a token in an `Authorization` header.

If we add `app.use(handler)` below the line where we initalized the `app`, then we get access to:

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/verify`

The first two routes require a post body with an email and password.  All of the above routes (if valid requests are given) respond with a `token` and `user` data.

With the above set up, if we make a request to `http://localhost:3001/auth/verify`, we'll get a `401` response with the error message *no token provided*.