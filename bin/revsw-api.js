/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2015] Rev Software, Inc.
 * All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Rev Software, Inc. and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Rev Software, Inc.
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Rev Software, Inc.
 */

/*jslint node: true */

'use strict';
var Hapi = require('hapi'),
  Swagger = require('hapi-swagger'),
  jwt = require('jsonwebtoken'),
  Fs = require('fs'),
  config = require('config'),
  AuditLogger = require('revsw-audit'),
  Pack = require('../package'),
  UserAuth = require('../handlers/userAuth'),
  validateJWTToken = require('../handlers/validateJWTToken'),
  User = require('../models/User');

var server = new Hapi.Server();


AuditLogger.init(
  {
    mongodb : {
      db         : 'mongodb://TESTSJC20-CMDB01.REVSW.NET:27017/revportal?replicaSet=CMDB-rs0',
      collection : 'audit_events'
    },
    file    : {
      filename  : 'log/revsw-audit.log',
      timestamp : true
    }
  }
);

var jwtPrivateKey = config.get('jwt_private_key');

// Configure SSL connection
server.connection({
  host: config.get('service.host'),
  port: config.get('service.https_port'),
  tls: {
    key: Fs.readFileSync(config.get('key_path')),
    cert: Fs.readFileSync(config.get('cert_path'))
  },
  routes: { cors: true }
});

// Configure HTTP connection - all HTTP requests will be redirected to HTTPS
server.connection({
  host: config.get('service.host'),
  port: config.get('service.http_port')
});

server.views({
  path: 'templates',
  engines: {
    html: require('handlebars')
  },
  partialsPath: './templates/withPartials',
  helpersPath: './templates/helpers',
  isCached: false
});

// setup swagger options
var swaggerOptions = {
  apiVersion: Pack.version,
  pathPrefixSize: 2,
  tagging: {
    mode: 'tags',
    pathLevel: 2
  },
  tags: {
    'purge': 'Purging of cached objects',
    'users': 'Management of Rev portal users',
    'portal': 'Internal portal calls'
  },
  authorizations: {
    default: {
      type: 'apiKey',
      passAs: 'header',
      keyname: 'Rev-API-Key'
    }
  },
  info: {
    title: 'RevAPM API Guide',
    // description: 'This API provides full control on Rev\'s global acceleration platform. For detailed information about the interface please see below.',
    contact: 'support@revsw.com'
  }
};


server.register(require('hapi-forward'), function (err) {
  if (err) {
    console.error('Failed to load a plugin:', err);
  }
});

server.register(require('hapi-auth-basic'), function (err) {
  server.auth.strategy('simple', 'basic', { validateFunc: UserAuth });
});

server.register(require('hapi-auth-jwt'), function (err) {
  server.auth.strategy('token', 'jwt', {
    key: jwtPrivateKey,
    validateFunc: validateJWTToken
  });
});


// adds swagger self documentation plugin
server.register([{
  register: require('hapi-swagger'),
  options: swaggerOptions
}, {
  register: require('blipp')
}], function(err) {
  if (err) {
    console.log(['error'], 'plugin "hapi-swagger" load error: ' + err);
  } else {
    console.log(['hapi-swagger', 'start'], 'swagger interface loaded');

    server.start(function() {
      console.log(['hapi', 'start'], Pack.name + ' - web interface: ' + server.info.uri);
    });
  }
});

server.auth.default({
  strategies: [ 'simple', 'token' ]
});

//server.route(Routes.routes);

// Redirect all non-HTTPS requests to HTTPS
server.ext('onRequest', function (request, reply) {
  if ( request.connection.info.port !==  config.get('service.https_port') ) {
    return reply.redirect('https://' + request.headers.host +
      request.url.path).code(301);
  }
  reply.continue();
});

var goodOptions = {
  opsInterval: 60000,
  requestHeaders: true,
  requestPayload: true,
  responsePayload: true,
  responseEvent: 'response',
  reporters: [{
    reporter: require('good-console'),
      events: { log: '*', response: '*', ops: '*', error: '*', request: '*' }
  },
  {
    reporter: require('good-file'),
    events: { log: '*', response: '*', ops: '*', error: '*', request: '*' },
    config: {
      path: config.get('log_dir'),
      rotate: 'weekly'
    }
  }]
};

server.register({
  register: require('good'),
  options: goodOptions
}, function (err) {
  if (err) {
    console.error(err);
  }
});

server.register({
  register: require('hapi-router'),
  options: {
    routes: 'routes/*.js' // uses glob to include files
  }
}, function (err) {
  if (err) {
    throw err;
  }
});
