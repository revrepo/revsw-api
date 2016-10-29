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
var API= require('./../../../common/api');
var DomainConfigsDP= require('./../../../common/providers/data/domainConfigs');

describe('Sanity check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var account;
  var firstDc;
  var reseller = config.get('api.users.reseller');
  var expectedDateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;

  before(function (done) {
    API.helpers
      .authenticateUser(reseller)
      .then(function () {
        return API.helpers.accounts.createOne();
      })
      .then(function (newAccount) {
        account = newAccount;
        return API.helpers.domainConfigs.createOne(account.id);
      })
      .then(function (domainConfig) {
        firstDc = domainConfig;
      })
      .then(done)
      .catch(done);
  });

  after(function (done) {
    API.helpers
      .authenticateUser(reseller)
      .then(function () {
        API.resources.domainConfigs.deleteOne(firstDc.id);
        done();
      })
      .catch(done);
  });

  describe('Domain Configs resource', function () {
    describe('Date Format', function () {

      beforeEach(function (done) {
        done();
      });

      afterEach(function (done) {
        done();
      });

      it('should return `created_at` field in expected `Date format` when ' +
        'getting all domain configs.',
        function (done) {
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              API.resources.domainConfigs
                .getAll()
                .expect(200)
                .then(function (response) {
                  var domainConfigs = response.body;
                  domainConfigs.forEach(function (domainConfig) {
                    domainConfig.created_at.should.match(expectedDateFormat);
                  });
                  done();
                })
                .catch(done);
            })
            .catch(done);
        });

      it('should return `created_at` field in expected `Date format` when ' +
        'getting versions of existing domain config.',
        function (done) {
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              API.resources.domainConfigs
                .versions(firstDc.id)
                .getAll()
                .expect(200)
                .then(function (response) {
                  var dcVersions = response.body;
                  dcVersions.forEach(function (domainConfig) {
                    domainConfig.created_at.should.match(expectedDateFormat);
                  });
                  done();
                })
                .catch(done);
            })
            .catch(done);
        });

      it('should return `updated_at` field in expected `Date format` when ' +
        'getting all domain configs.',
        function (done) {
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              API.resources.domainConfigs
                .getAll()
                .expect(200)
                .then(function (response) {
                  var domainConfigs = response.body;
                  domainConfigs.forEach(function (domainConfig) {
                    domainConfig.updated_at.should.match(expectedDateFormat);
                  });
                  done();
                })
                .catch(done);
            })
            .catch(done);
        });

      it('should return `updated_at` field in expected `Date format` when ' +
        'getting versions of existing domain config.',
        function (done) {
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              API.resources.domainConfigs
                .versions(firstDc.id)
                .getAll()
                .expect(200)
                .then(function (response) {
                  var dcVersions = response.body;
                  dcVersions.forEach(function (domainConfig) {
                    domainConfig.updated_at.should.match(expectedDateFormat);
                  });
                  done();
                })
                .catch(done);
            })
            .catch(done);
        });
    });
  });
});
