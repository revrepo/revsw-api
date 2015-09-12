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
  Pack = require('../package'),
  Fs = require('fs'),
  config = require('config'),
  Routes = require('../lib/routes.js'),
  UserAuth = require('../lib/handlers.js').UserAuth,
  User = require('../lib/user.js').User,
  AuditLogger = require('revsw-audit');

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

/*AuditLogger.store({
  domain_id : 'dqwdqw312d122',
  company_id : 'dqwd11231231',
  datetime: 1442005200000,
  usertype: 'user',
  username: 'admin',
  user_id: '55b7018a7957012304a49d09',
  account: 'ddqwdqd',
  account_id: 'dk09qd10d910d01d01d81jd910d091ddsdacs',
  activity_type: 'add',
  activity_target: 'user',
  target_name: 'target_name',
  target_id: 'target_id',
  operation_status: 'failure',
  target_object: {test : 'test'}
});*/

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
    'users': 'Management of Rev portal users'
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

server.register(require('hapi-auth-basic'), function (err) {
    server.auth.strategy('simple', 'basic', { validateFunc: UserAuth });
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

server.route(Routes.routes);

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

