'use strict';

const fs = require('fs');
const path = require('path');
const del = require('del');
const AWS = require('aws-sdk');
const multer = require('multer');
const Router = require('express').Router;
const createError = require('http-errors');
const debug = require('debug')('gear-share:post-obj-router');

const PostObj = require('../model/post-obj.js');
const Gallery = require('../model/gallery.js');
const bearerAuth = require('../lib/bearer-auth-middleware.js');

AWS.config.setPromisesDependency(require('bluebird'));

const s3 = new AWS.S3();
const dataDir = `${__dirname}/../data`;
const upload = multer({ dest: dataDir});

const postObjRouter = module.exports = Router();

function s3uploadProm(params) {
  return new Promise((resolve, reject) => {

    s3.upload(params, (err, s3data) => {
      if (err) return reject (err);
      resolve(s3data);
    });
  });
}

postObjRouter.post('/api/gallery/:galleryID/postObj', bearerAuth, function(req, res, next) { //TODO upload.single('image') required?
  debug('POST: /api/gallery/galleryID/postObj');

  if(!req.file) {
    return next(createError(400, 'file not found'));
  }

  if(!req.file.path) {
    return next(createError(500, 'file not saved'));
  }

  let ext = path.extname(req.file.originalname);

  let params = {
    ACL: 'public-read',
    Bucket: process.env.AWS_BUCKET,
    Key: `${req.file.filename}${ext}`,
    Body: fs.createReadStream(req.file.path)
  };

  Gallery.findById(req.params.galleryID)
  .then( () => s3uploadProm(params))
  .then( s3data => {
    del([`${dataDir}/*`]);
    let postObjData = {
      name: req.body.name,
      desc: req.body.desc,
      price: req.body.price,
      location: req.body.location,
      objectKey: s3data.Key,
      imageURI: s3data.Location,
      userID: req.user._id,
      galleryID: req.params.galleryID
    };
    return new PostObj(postObjData).save();
  })
  .then( postObj => res.json(postObj)) //TODO double check this should be postObj
  .catch( err => next(err));

});
