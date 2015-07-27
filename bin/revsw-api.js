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
  Config = require('../config/config'),
  Routes = require('../lib/routes.js'),
  UserAuth = require('../lib/handlers.js').UserAuth,
  User = require('../lib/user.js').User;

var server = new Hapi.Server();
server.connection({
  host: Config.service.url,
  port: 8000
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
  authorizations: {
    default: {
      type: 'apiKey',
      passAs: 'header',
      keyname: 'Rev-API-Key'
    }
  },
  info: {
    title: 'RevAPM API Guide',
    description: 'This API provides full control on Rev\'s global acceleration platform.',
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
