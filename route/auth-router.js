'use strict';

const jsonParser = require('body-parser').json();
const debug = require('debug')('gear-share:auth-router');
const Router = require('express').Router;
const basicAuth = require('../lib/basic-auth-middleware.js');

const User = require('../model/user.js');

const authRouter = module.exports = Router();

authRouter.post('/api/signup', jsonParser, function(req, res, next) {
  debug('POST: /api/signup');

  if(!req.body.username || !req.body.email || !req.body.password) {
    res.status(400).send();
    return;
  }

  let password = req.body.password;
  delete req.body.password;

  let user = new User(req.body);

  user.generatePasswordHash(password)
  .then(user => user.save())
  .then(user => user.generateToken())
  .then(token => res.send(token))
  .catch(next);
});
