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

require('should-http');

var config = require('config');
var API = require('./../../common/api');
var DomainConfigsDP = require('./../common/providers/data/domainConfigs');

describe('CRUD check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var resellerUser = config.get('api.users.reseller');

  before(function (done) {
    done();
  });

  after(function (done) {
    done();
  });

  describe('Domain Configs resource', function () {

    beforeEach(function (done) {
      done();
    });

    afterEach(function (done) {
      done();
    });

    it('should return `Bad Request` when trying to `create` domain config ' +
      'with `invalid` name.',
      function () {
      });

    it('should return `Bad Request` when trying to `create` domain config ' +
      'with `invalid` account id.',
      function () {
      });

    it('should return `Bad Request` when trying to `create` domain config ' +
      'with `invalid` origin host header.',
      function () {
      });

    /* BUG? Accepts 0000 */
    it('should return `Bad Request` when trying to `create` domain config ' +
      'with `invalid` origin server.',
      function () {
      });

    it('should return `Bad Request` when trying to `create` domain config ' +
      'with `invalid` host server location id.',
      function () {
      });

    /* BUG? Accepts any string */
    it('should return `Bad Request` when trying to `create` domain config ' +
      'with `invalid` tolerance.',
      function () {
      });

    it('should return `Bad Request` when trying to get `domain publishing ' +
      'status` with `invalid` id.',
      function () {
      });

    it('should return `Bad Request` when trying to get `domain configuration ' +
      'versions` with `invalid` id.',
      function () {
      });
  });
});
