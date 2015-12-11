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
var AccountsDP = require('./../../common/providers/data/accounts');
var DomainConfigsDP = require('./../../common/providers/data/domainConfigs');

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
        return API.resources.domainConfigs.deleteOne(domainConfig.id);
      })
      .then(function () {
        return API.resources.accounts.deleteAllPrerequisites(done);
      })
      .catch(done);
  });

  describe('Domain Configs resource', function () {
    describe('With empty data', function () {

      beforeEach(function (done) {
        done();
      });

      afterEach(function (done) {
        done();
      });

      it('should return `Bad Request` when trying to `create` domain config ' +
        'with `empty` name.',
        function (done) {
          var emptyDomainName = '';
          var expectedMsg = 'child "domain_name" fails because ' +
            '["domain_name" is not allowed to be empty]';
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              var domainConfig = DomainConfigsDP.generateOne(account.id);
              domainConfig.domain_name = emptyDomainName;
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
        'with `empty` account id.',
        function (done) {
          var emptyAccountId = '';
          var expectedMsg = 'child "account_id" fails because ["account_id" ' +
            'is not allowed to be empty]';
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              var domainConfig = DomainConfigsDP.generateOne(emptyAccountId);
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
        'with `empty` origin host header.',
        function (done) {
          var emptyOriginHostHeader = '';
          var expectedMsg = 'child "origin_host_header" fails because ' +
            '["origin_host_header" is not allowed to be empty]';
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              var domainConfig = DomainConfigsDP.generateOne(account.id);
              domainConfig.origin_host_header = emptyOriginHostHeader;
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
        'with `empty` origin server.',
        function (done) {
          var emptyOriginServer = '';
          var expectedMsg = 'child "origin_server" fails because ' +
            '["origin_server" is not allowed to be empty]';
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              var domainConfig = DomainConfigsDP.generateOne(account.id);
              domainConfig.origin_server = emptyOriginServer;
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
        'with `empty` host server location id.',
        function (done) {
          var emptyLocationId = '';
          var expectedMsg = 'child "origin_server_location_id" fails because ' +
            '["origin_server_location_id" is not allowed to be empty]';
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              var domainConfig = DomainConfigsDP.generateOne(account.id);
              domainConfig.origin_server_location_id = emptyLocationId;
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
        'with `empty` tolerance.',
        function (done) {
          var emptyTolerance = '';
          var expectedMsg = 'child "tolerance" fails because ["tolerance" ' +
            'is not allowed to be empty]';
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              var domainConfig = DomainConfigsDP.generateOne(account.id);
              domainConfig.tolerance = emptyTolerance;
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

      it('should return `Bad Request` when trying to get `domain publishing ' +
        'status` with `empty` id.',
        function (done) {
          var emptyDomainId = '';
          var expMsg = 'child \"domain_id\" fails because [\"domain_id\" ' +
            'with value \"config_status\" fails to match the required ' +
            'pattern: /^[0-9a-fA-F]{24}$/]';
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              API.resources.domainConfigs
                .status(emptyDomainId)
                .getOne()
                .expect(400)
                .then(function (res) {
                  res.body.message.should.equal(expMsg);
                  done();
                })
                .catch(done);
            })
            .catch(done);
        });

      it('should return `Bad Request` when trying to get `domain ' +
        'configuration versions` with `empty` id.',
        function (done) {
          var emptyDomainId = '';
          var expectedMsg = 'child \"domain_id\" fails because [\"domain_id' +
            '\" with value \"versions\" fails to match the required ' +
            'pattern: /^[0-9a-fA-F]{24}$/]';
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              API.resources.domainConfigs
                .versions(emptyDomainId)
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
