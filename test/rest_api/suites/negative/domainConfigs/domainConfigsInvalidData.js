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
    API.identity
      .authenticate(reseller)
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
    API.identity
      .authenticate(reseller)
      .then(function () {
        API.resources.domainConfigs.deleteOne(domainConfig.id);
        done();
      })
      .catch(done);
  });

  describe('Domain Configs resource', function () {
    describe('With invalid data', function () {

      beforeEach(function (done) {
        done();
      });

      afterEach(function (done) {
        done();
      });

      it('should return `Bad Request` when trying to `create` domain config ' +
        'with `invalid` name.',
        function (done) {
          var invalidDomainName = 'invalid-domain-name';
          var expMsg = 'child "domain_name" fails because ["domain_name" ' +
            'with value "' + invalidDomainName + '" fails to match the ' +
            'required pattern: /(?=^.{4,253}$)(^((?!-)(?!\\_)[a-zA-Z0-9-\\_]' +
            '{0,62}[a-zA-Z0-9]\\.)+[a-zA-Z]{2,63}$)/]';
          API.identity
            .authenticate(reseller)
            .then(function () {
              var domainConfig = DomainConfigsDP.generateOne(account.id);
              domainConfig.domain_name = invalidDomainName;
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

      it('should return `Bad Request` when trying to `create` domain config ' +
        'with `invalid` account id.',
        function (done) {
          var invalidAccountId = 'vwxyzvwxyzvwxyzvwxyz1234';
          var expectedMsg = 'child "account_id" fails because ["account_id" ' +
            'with value "' + invalidAccountId + '" fails to match the ' +
            'required pattern: /^[0-9a-fA-F]{24}$/]';
          API.identity
            .authenticate(reseller)
            .then(function () {
              var domainConfig = DomainConfigsDP.generateOne(invalidAccountId);
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
        'with `invalid` origin host header.',
        function (done) {
          var invalidOriginHostHeader = 'invalid-origin-host-header';
          var expectedMsg = 'child "origin_host_header" fails because ["' +
            'origin_host_header" with value "' + invalidOriginHostHeader +
            '" fails to match the required pattern: /(?=^.{4,253}$)(^((?!-)' +
            '(?!\\_)[a-zA-Z0-9-\\_]{0,62}[a-zA-Z0-9]\\.)+[a-zA-Z]{2,63}$)/]';
          API.identity
            .authenticate(reseller)
            .then(function () {
              var domainConfig = DomainConfigsDP.generateOne(account.id);
              domainConfig.origin_host_header = invalidOriginHostHeader;
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
        'with `invalid` origin server.',
      function (done) {
        var invalidOriginServer = '12345.12345.12345';
        var expectedMsg = 'child "origin_server" fails because ["origin_server" with value "' + invalidOriginServer +
          '" fails to match the required pattern: /(?=^.{4,253}$)(^((?!-)(?!\\_)[a-zA-Z0-9-\\_]{0,62}' +
          '[a-zA-Z0-9]\\.)+[a-zA-Z]{2,63}$)/, "origin_server" with value "' + invalidOriginServer +
          '" fails to match the required pattern: /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\\.)' +
          '{3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/]';
        API.identity
          .authenticate(reseller)
          .then(function () {
            var domainConfig = DomainConfigsDP.generateOne(account.id);
            domainConfig.origin_server = invalidOriginServer;
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
        'with `invalid` host server location id.',
        function (done) {
          var invalidLocationId = 'vwxyzvwxyzvwxyzvwxyz1234';
          var expectedMsg = 'child "origin_server_location_id" fails because ' +
            '["origin_server_location_id" with value "' + invalidLocationId +
            '" fails to match the required pattern: /^[0-9a-fA-F]{24}$/]';
          API.identity
            .authenticate(reseller)
            .then(function () {
              var domainConfig = DomainConfigsDP.generateOne(account.id);
              domainConfig.origin_server_location_id = invalidLocationId;
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
        'with `invalid` tolerance.',
        function (done) {
          var invalidTolerance = 'abcdefghijklmnopqrstuvwxyz';
          var expectedMsg = 'child "tolerance" fails because ["tolerance" ' +
            'with value "' + invalidTolerance + '" fails to match the ' +
            'required pattern: /^\\d+$/]';
          API.identity
            .authenticate(reseller)
            .then(function () {
              var domainConfig = DomainConfigsDP.generateOne(account.id);
              domainConfig.tolerance = invalidTolerance;
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
        'status` with `invalid` domain id.',
        function (done) {
          var invalidDomainId = 'vwxyzvwxyzvwxyzvwxyz1234';
          var expectedMsg = 'child \"domain_id\" fails because [\"domain_id' +
            '\" with value \"' + invalidDomainId + '\" fails to match the ' +
            'required pattern: /^[0-9a-fA-F]{24}$/]';
          API.identity
            .authenticate(reseller)
            .then(function () {
              API.resources.domainConfigs
                .status(invalidDomainId)
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

      it('should return `Bad Request` when trying to get `domain ' +
        'configuration versions` with `invalid` domain id.',
        function (done) {
          var invalidDomainId = 'vwxyzvwxyzvwxyzvwxyz1234';
          var expectedMsg = 'child "domain_id" fails because ["domain_id" ' +
            'with value "' + invalidDomainId + '" fails to match the ' +
            'required pattern: /^[0-9a-fA-F]{24}$/]';
          API.identity
            .authenticate(reseller)
            .then(function () {
              API.resources.domainConfigs
                .versions(invalidDomainId)
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
