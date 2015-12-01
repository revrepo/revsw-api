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

    it('should return `created_at` field in expected `Date format` when ' +
      'getting all domain configs.',
      function () {
      });

    it('should return `created_at` field in expected `Date format` when ' +
      'getting specific domain config.',
      function () {
      });

    it('should return `updated_at` field in expected `Date format` when ' +
      'getting all domain configs.',
      function () {
      });

    it('should return `updated_at` field in expected `Date format` when ' +
      'getting specific domain config.',
      function () {
      });
  });
});
