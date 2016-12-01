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

// @see https://github.com/dyninc/statuspage-api

var https = require('https'),
  _ = require('lodash'),
  qs = require('qs'),
  util = require('util'),
  events = require('events');

// Array of valid API elements that can be used for POST requests
var ELEMENTS_POST = [
  'subscribers'
];

// Array of valid API elements that can be used for DELETE requests
var ELEMENTS_DELETE = [
  'subscriber'
];
// Array of valid API elements that can be used for GET requests
var ELEMENTS_GET = [
  'pages',
  'subscribers'
];

var StatusPageBase = function() {};

StatusPageBase.prototype = new events.EventEmitter();

StatusPageBase.prototype.scheduleCallback = function(callback, delay) {
  return setTimeout(callback, delay);
};

StatusPageBase.prototype.cancelCallback = function(identifier) {
  clearTimeout(identifier);
};

var isValidOperation = function(method, element) {
  // Validate Request method and element.
  var validity = false;
  switch (method) {
    case 'GET':
      validity = element && _(ELEMENTS_GET).include(element.toLowerCase());
      break;
    case 'POST':
      validity = element && _(ELEMENTS_POST).include(element.toLowerCase());
      break;
    case 'DELETE':
      validity = element && _(ELEMENTS_DELETE).include(element.toLowerCase());
      break;
      // TODO: Not implemented
      // case 'PATCH':
      //     validity = method && _(ELEMENTS_PATCH).include(method.toLowerCase());
      //     break;
      // case 'PUT':
      //     validity = method && _(ELEMENTS_PUT).include(method.toLowerCase());
      //     break;

  }
  // console.log('debug', 'Validity(' + method + ', ' + element + '): ' + validity);
  return validity;
};

var isWriteOperation = function(httpVerb) {
  return httpVerb === 'POST' || httpVerb === 'PATCH' || httpVerb === 'PUT';
};

var requestHeaders = function(httpVerb, data, statuspage) {
  var headers = {
    'User-Agent': statuspage.useragent,
    'Authorization': statuspage.apiKey
  };

  if (isWriteOperation(httpVerb)) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    headers['Content-Length'] = Buffer.byteLength(data);
  }
  return headers;
};

var makeUrl = function(pageId, element, args) {
  // Combine page ID and element to form request URI
  // TODO: This function will need to be updated to support
  // additional specifical elements and operations
  var url = '/v1/pages/' + pageId;
  switch (element) {
    case 'pages':
      url += '.json';
      break;
    case 'subscriber':
      url += '/subscribers/' + args.subscriber_id + '.json';
      break;
    default:
      url += '/' + element + '.json';
      break;
  }
  return url;
};

var StatusPageRequest = function(statuspage) {
  StatusPageBase.call(this);
  this.statuspage = statuspage;
};

StatusPageRequest.prototype = Object.create(StatusPageBase.prototype);

StatusPageRequest.prototype.chunkedResponse = function(res, callback) {
  var self = this,
    data = '',
    result = {};

  res.on('data', function(chunk) {
    data += chunk.toString('utf8');
  });
  res.on('end', function() {
    // Package response data
    var json = {
      data: {},
      response: {
        statusCode: res.statusCode,
        statusMessage: res.statusMessage,
        headers: res.headers
      }
    };

    try {
      // console.log('debug', ['Raw Response data: ', data])
      json.data = JSON.parse(data);
      // Error parsing JSON response
      if (json.error) {
        result.status = 'error';
        result.error = json;
        self.emit('error', json);
      }
      // Status OK, so return success
      if (res.statusCode === 200 || res.statusCode === 201) {
        result.status = 'success';
        result.error = null;
        result.data = json.data;
        // Something went wrong
      } else {
        var message = 'Unexpected response: ' +
          json.response.statusCode + ' ' +
          json.response.statusMessage;
        result.status = 'failure';
        result.error = message;
      }
      self.emit('success', json);
    } catch (e) {
      result.status = 'error';
      result.error = e;
      self.emit('error', e);
    }
    if (typeof callback === 'function') {
      callback(result);
    } else {
      return result;
    }
  });
};

StatusPageRequest.prototype.sendRequest = function(method, element, args, callback) {
  var self = this,
    statuspage = this.statuspage;
  args = args || {};
  if (isValidOperation(method, element)) {
    // Prepare data to be sent to API
    var host = statuspage.host,
      port = statuspage.port,
      url = makeUrl(statuspage.pageId, element, args),
      httpVerb = method,
      data = qs.stringify(args, { arrayFormat: 'brackets' }),
      options = {
        host: host,
        port: port,
        path: url,
        method: httpVerb,
        headers: requestHeaders(httpVerb, data, statuspage)
      };

    if (method === 'GET') {
      options = {
        host: host,
        port: port,
        path: url + '?' + data,
        method: httpVerb,
        headers: requestHeaders(httpVerb, '', statuspage)
      };
    }

    if (method === 'DELETE' && element === 'subscriber') {
      options = {
        host: host,
        port: port,
        path: url,
        method: httpVerb,
        headers: requestHeaders(httpVerb, '', statuspage)
      };
    }
    // TODO: add logger
    // console.log('debug', ['Query String: ', data]);
    // console.log('debug', ['Request options: ', options]);
    // Send API request
    var req = https.request(options, function(res) {
      self.chunkedResponse(res, callback);
    });
    req.on('error', function(error) {
      self.emit('error', error);
    });
    if (isWriteOperation(httpVerb)) {
      req.write(data, 'utf8');
    }
    req.end();
  } else {
    // Emit warning
    var warningMessage = 'Request is not supported. ' + method + ': ' + element;
    this.on('warning', function() {
      // TODO: logger
      // console.log('warn', warningMessage);
    });
    this.emit('warning', warningMessage);
  }
};

//===============

var StatusPageAPI = function(options) {
  options = options || {};
  this.host = options.host || 'api.statuspage.io';
  this.port = options.port || 443;
  this.pageId = options.pageId || '<ADD YOUR OWN PAGE ID>';
  this.apiKey = options.apiKey;
  this.useragent = options.useragent || 'statuspage-node';
  this.debuglevel = options.debuglevel || 'warn';
};

StatusPageAPI.prototype.get = function(element, args, callback) {
  var statuspageRequest = new StatusPageRequest(this);
  return statuspageRequest.sendRequest('GET', element, args, callback);
};

StatusPageAPI.prototype.post = function(element, args, callback) {
  var statuspageRequest = new StatusPageRequest(this);
  return statuspageRequest.sendRequest('POST', element, args, callback);
};

StatusPageAPI.prototype.delete = function(element, args, callback) {
  var statuspageRequest = new StatusPageRequest(this);
  return statuspageRequest.sendRequest('DELETE', element, args, callback);
};

exports.StatusPageAPI = StatusPageAPI;
