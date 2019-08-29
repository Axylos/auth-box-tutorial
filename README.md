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

We can effectively treat this as not being logged in.

#### Simulating an Auth Workflow

Using some HTTP client, e.g., `axios`, `fetch`, `insomnia`, `cURL`, etc, make a `POST` request to `http://localhost:3001/auth/register` with a POST body containing a new email and password.

The resulting json response should look something like this:

```json
{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NSwiZW1haWwiOiJib2JieUBnbWFpbC5jb20iLCJwYXNzd29yZF9kaWdlc3QiOiIkMmIkMDgkOEtVb3J6aGV0cnNSS3B6Zk84dC55Lk1SUzlhM2N0Z2xZT3diNmJsYnpXaEpyaUhmbUhJWjIiLCJ1cGRhdGVkQXQiOiIyMDE5LTA4LTI5VDE1OjM3OjMxLjM3MloiLCJjcmVhdGVkQXQiOiIyMDE5LTA4LTI5VDE1OjM3OjMxLjM3MloiLCJpYXQiOjE1NjcwOTMwNTF9.aKbmkx1_MA956Z0OOcWHXgPrVbuNPKBQTtgGvvmiZ1I",
    "user": {
        "createdAt": "2019-08-29T15:37:31.372Z",
        "email": "bobby@gmail.com",
        "id": 5,
        "updatedAt": "2019-08-29T15:37:31.372Z"
    }
}
```

If you make a request with the same username but a different password to `http://localhost:3001/auth/login`, you should get a 401 with an `Invalid Credentials` error message.

If another request is made with the correct email/password credentials, then the same response is given as above:

```json
{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJib2JieUBnbWFpbC5jb20iLCJwYXNzd29yZF9kaWdlc3QiOiIkMmIkMDgkbU9ERzZTWnEzdmpLRmp6bk1xdy5MZXJkdHNoaDBEdjlWb0lkeEJ6Y0hrbnJJaHRiMkNPOHEiLCJjcmVhdGVkQXQiOiIyMDE5LTA4LTI5VDE1OjM2OjI5LjEzMFoiLCJ1cGRhdGVkQXQiOiIyMDE5LTA4LTI5VDE1OjM2OjI5LjEzMFoiLCJpYXQiOjE1NjcwOTMyNTZ9.SDdXgLh7EeH5a42mcytq2_D47huDnhjmKABCraoKOfA",
    "user": {
        "createdAt": "2019-08-29T15:36:29.130Z",
        "email": "bobby@gmail.com",
        "id": 1,
        "updatedAt": "2019-08-29T15:36:29.130Z"
    }
}
```

### Verifying

Lastly, we can manually insert the `token` provided in these first two responses into an `Authorization` header to make "authenticated" requests to the server.

Recall that if we simply make a request to `/auth/verify` the server responds with a `401`.

On the other hand, if we correctly attach the token to the request, the server will respond with a success status code.

We can do that by adding the following header:
```
Authorization: Bearer <token>
```

Note that the braces are not necessary `< >`; they simply denote that the value inside should be the value of a token and not the string "token".

Here is an example header using the token from above:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJib2JieUBnbWFpbC5jb20iLCJwYXNzd29yZF9kaWdlc3QiOiIkMmIkMDgkbU9ERzZTWnEzdmpLRmp6bk1xdy5MZXJkdHNoaDBEdjlWb0lkeEJ6Y0hrbnJJaHRiMkNPOHEiLCJjcmVhdGVkQXQiOiIyMDE5LTA4LTI5VDE1OjM2OjI5LjEzMFoiLCJ1cGRhdGVkQXQiOiIyMDE5LTA4LTI5VDE1OjM2OjI5LjEzMFoiLCJpYXQiOjE1NjcwOTMyNTZ9.SDdXgLh7EeH5a42mcytq2_D47huDnhjmKABCraoKOfA
```

If the `verify` is successful, the server will respond with a user object as above.

If you get a `200` status code from `GET /auth/verify`, then you have successfully completed an auth workflow!  Yay!

The next step is "protecting" custom routes with a `restrict` middleware.  `restrict` performs a similar role to `GET /auth/verify`, with the caveat that restrict performs the same action on routes we write ourselves rather than just on the one `/auth/verify/` route.

### A Secret!

Let's add a `/secret` route with the answer to life.

*Hint*: It's 42.

We can define a route like normal, but insert a `restrict` in between the path and route handler:

```js
app.get('/secret', restrict, (req, res) => {
  res.json("The answer is 42");
});
```

Try dispatching a request to this route, viz., `GET http://localhost:3001/secret`

Without a token, the server will respond with a `401` status code and error message of `Invalid Token`.

If a token is attached to the request as an authorization header, then `restrict` will permit the request to proceed to the request handler and the request will successfully complete.

Let's do one more where we return _just the email of the current user_.

Let's define another route, `GET /userinfo`.  This time, we will access `res.locals`.  This is an object where information can be shared _across middleware functions.

```js
app.get('/userinfo', restrict, (req, res) => {
  const email = res.locals.user.email;
  res.json({ email: email });
});
```

Take note: you can only access the `user` object on `res.locals` on routes that include the `restrict` middleware function between the path and the route handler function.

Also, since `restrict` only permits requests through that have a valid token, if a valid token is not passed as an authentication bearer token, the server will respond with a `401 Invalid Token`.