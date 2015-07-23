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
  Routes = require('../lib/routes.js');


var server = new Hapi.Server();
server.connection({
  host: '0.0.0.0',
  port: 8000
});

server.route(Routes.routes);

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
      type: "apiKey",
      passAs: "header",
      keyname: "authentication"
    }
  },
  info: {
    title: 'RevAPM API Guide',
    description: 'This API provides full control on Rev\'s global acceleration platform.',
    contact: 'support@revsw.com'
  }

};


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
