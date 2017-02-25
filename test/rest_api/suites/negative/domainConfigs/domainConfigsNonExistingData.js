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
var AccountsDP= require('./../../../common/providers/data/accounts');
var DomainConfigsDP= require('./../../../common/providers/data/domainConfigs');

describe('Negative check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var account;
  var domainConfig;
  var reseller = config.get('api.users.reseller');

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
      .then(function (newDomainConfig) {
        domainConfig = newDomainConfig;
      })
      .then(done)
      .catch(done);
  });

  after(function (done) {
    API.helpers
      .authenticateUser(reseller)
      .then(function () {
        API.resources.domainConfigs.deleteOne(domainConfig.id);
        done();
      })
      .catch(done);
  });

  describe('Domain Configs resource', function () {
    describe('With non-existing data', function () {

      beforeEach(function (done) {
        done();
      });

      afterEach(function (done) {
        done();
      });

      it('should return `Bad Request` when trying to `create` domain config ' +
        'with `non-existing` account id.',
        function (done) {
          var nonExistingAccountId = 'aaaafaaaafaaaafaaaaf1234';
          var expectedMsg = 'Account ID not found';
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              var domainConfig =
                DomainConfigsDP.generateOne(nonExistingAccountId);
              API.resources.domainConfigs
                .createOne(domainConfig)
                .expect(400)
                .then(function (res) {
                  res.body.message.should.equal(expectedMsg);
                  done();
                })
                .catch(done);
            })
            .catch(done);
        });

      it('should return `Bad Request` when trying to `create` domain config ' +
        'with `non-existing` host server location id.',
        function (done) {
          var nonExistingLocationId = 'aaaafaaaafaaaafaaaaf1234';
          var expMsg = 'Specified first mile location ID cannot be found';
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              var domainConfig = DomainConfigsDP.generateOne(account.id);
              domainConfig.origin_server_location_id = nonExistingLocationId;
              API.resources.domainConfigs
                .createOne(domainConfig)
                .expect(400)
                .then(function (res) {
                  res.body.message.should.equal(expMsg);
                  done();
                })
                .catch(done);
            })
            .catch(done);
        });

      it('should return `Bad Request` when trying to get `domain publishing ' +
        'status` with `non-existing` domain id.',
        function (done) {
          var nonExistingDomainId = 'aaaafaaaafaaaafaaaaf1234';
          var expectedMsg = 'Domain ID not found';
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              API.resources.domainConfigs
                .status(nonExistingDomainId)
                .getOne()
                .expect(400)
                .then(function (res) {
                  res.body.message.should.equal(expectedMsg);
                  done();
                })
                .catch(done);
            })
            .catch(done);
        });

      it('should return `Bad Request` when trying to get `domain configuration ' +
        'versions` with `non-existing` domain id.',
        function (done) {
          var nonExistingDomainId = 'aaaafaaaafaaaafaaaaf1234';
          var expectedMsg = 'Domain ID not found';
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              API.resources.domainConfigs
                .versions(nonExistingDomainId)
                .getAll()
                .expect(400)
                .then(function (res) {
                  res.body.message.should.equal(expectedMsg);
                  done();
                })
                .catch(done);
            })
            .catch(done);
        });
    });
  });
});
