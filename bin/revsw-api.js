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

// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

'use strict';

var Hapi = require('hapi'),
    Swagger = require('hapi-swagger'),
    jwt = require('jsonwebtoken'),
    Fs = require('fs'),
    config = require('config'),
    AuditLogger = require('../lib/audit'),
    Pack = require('../package'),
    validateJWTToken = require('../handlers/validateJWTToken').validateJWTToken,
    validateAPIKey = require('../handlers/validateAPIKey').validateAPIKey,
    User = require('../models/User'),
    os = require('os'),
    boom  = require('boom'),
    mail = require('../lib/mail');

var logger = require('revsw-logger')(config.log_config);

var notifyEmail = config.get('notify_developers_by_email_about_uncaught_exceptions');
if (notifyEmail !== '') {
  process.on('uncaughtException', function (er) {
    console.error(er.stack);
    mail.sendMail({
      from: 'eng@revsw.com',
      to: notifyEmail,
      subject: process.env.NODE_ENV + ':' + os.hostname() + ' ' + er.message,
      text: er.stack
    }, function (er, data) {
      if (er) {
         console.error(er);
      }
      process.exit(1);
    });
  });
}


var server = new Hapi.Server();



AuditLogger.init(
  {
    mongodb : {
      db         : config.get('portal_mongo.connect_string'),
      collection : 'audit_events'
    },
    file    : {
      filename  : config.get('log_dir') + config.get('audit_log'),
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
  routes: { cors: true },
  router: {
    isCaseSensitive: false,
    stripTrailingSlash: false
  }
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

server.register(require('hapi-auth-jwt'), function (err) {
  server.auth.strategy('token', 'jwt', {
    key: jwtPrivateKey,
    validateFunc: validateJWTToken
  });
});

server.register(require('../lib/hapi-auth-apikey'), function (err) {
  server.auth.strategy('apikey', 'apikey', {validateFunc: validateAPIKey});
});

server.register(require('../lib/chargify-webhook-signature'), function (err) {
  server.auth.strategy('hmac', 'signature');
});

// Used for authentication of Azure/ARM calls
server.register(require('hapi-auth-bearer-token'), function (err) {
    if(err) {
      logger.error('Could not register hapi-auth-bearer-token', err);
      // TODO currently it continues on error
    }
    server.auth.strategy('azure-token', 'bearer-access-token', {
        allowQueryToken: false,              // optional, true by default
        allowMultipleHeaders: false,        // optional, false by default
        accessTokenName: 'access_token',    // optional, 'access_token' by default
        tokenType: 'Bearer-RP',
        validateFunc: function(token, callback) {

            // For convenience, the request object can be accessed
            // from `this` within validateFunc.
            var request = this;
            var result = {
              token: token
            };

            if (token === config.get('azure_marketplace.api_token')) {
                logger.info('Successful Azure API token authentication');
                result.scope = 'azure-rp';
                callback(null, true, result);
            } else {
                logger.warn('Failed Azure API token authentication');
                callback(null, false, {token: token});
            }
        }
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
  strategies: ['token', 'apikey']
});

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

server.register(require('hapi-forward'), function (err) {
  if (err) {
    console.error('Failed to load a plugin:', err);
  }
});


server.ext('onPreResponse', function(request, reply) {
  var response = request.response;
  if (response.isBoom === true && response.output.statusCode === 500) {
    var notifyEmailBadImplementation = config.get('notify_developers_by_email_about_bad_implementation');
    if (notifyEmailBadImplementation !== '') {
      // use Boom function
      var err = boom.internal(response.message, response, 500);
      mail.sendMail({
        from: 'eng@revsw.com',
        to: notifyEmailBadImplementation,
        subject: '[HAPI Internal Error] ' + process.env.NODE_ENV + ':' + os.hostname() + ' ' + err.message,
        text: JSON.stringify(err) +
          '\n\n' + err.stack +
          '\n\n AUTH : ' + JSON.stringify(request.auth) +
          '\n\n METHOD : ' + JSON.stringify(request.method) +
          '\n\n PATH : ' + JSON.stringify(request.path)
      }, function(er, data) {
        if (er) {
          console.error(er);
        }
      });
    }
  }
  return reply.continue();
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
