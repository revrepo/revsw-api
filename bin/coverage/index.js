/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2017] Rev Software, Inc.
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

var istanbulMiddleware = require('istanbul-middleware');
var port = 8888;

istanbulMiddleware.hookLoader(function (path) {
  if ( /node_modules/.test(path) ||
       /bin\/coverage/.test(path) ) {
    return false;
  }
  console.info('COVERAGE::Instrumenting file::', path);
  return true;
}, {verbose: true});

require('./server').start(port);
