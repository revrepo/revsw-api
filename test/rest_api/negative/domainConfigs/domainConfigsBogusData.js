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

  var accountId;
  var reseller = config.get('api.users.reseller');

  before(function (done) {
    API.helpers
      .authenticateUser(reseller)
      .then(function () {
        API.resources.accounts
          .createOneAsPrerequisite(AccountsDP.generateOne())
          .then(function (res) {
            accountId = res.body.object_id;
            done();
          });
      })
      .catch(done);
  });

  after(function (done) {
    API.resources.accounts.deleteAllPrerequisites(done);
  });

  describe('Domain Configs resource', function () {
    describe('With bogus data', function () {

      beforeEach(function (done) {
        done();
      });

      afterEach(function (done) {
        done();
      });

      it('should return `Bad Request` when trying to `create` domain config ' +
        'with `bogus` name.',
        function (done) {
          var bogusDomainName = '&&&&&';
          var transformedStr = '&amp;&amp;&amp;&amp;&amp;';
          var expMessage = 'child "domain_name" fails because ["domain_name" ' +
            'with value "' + transformedStr + '" fails to match the required ' +
            'pattern: /(?=^.{4,253}$)(^((?!-)(?!\\_)[a-zA-Z0-9-\\_]{0,62}[a-z' +
            'A-Z0-9]\\.)+[a-zA-Z]{2,63}$)/]';
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              var domainConfig = DomainConfigsDP.generateOne(accountId);
              domainConfig.domain_name = bogusDomainName;
              API.resources.domainConfigs
                .createOne(domainConfig)
                .expect(400)
                .then(function (res) {
                  res.body.message.should.equal(expMessage);
                  done();
                })
                .catch(done);
            })
            .catch(done);
        });

      it('should return `Bad Request` when trying to `create` domain config ' +
        'with `bogus` account id.',
        function (done) {
          var bogusAccountId = '&&&&&';
          var transformedStr = '&amp;&amp;&amp;&amp;&amp;';
          var expectedMsg = 'child "account_id" fails because ["account_id" ' +
            'with value "' + transformedStr + '" fails to match the required ' +
            'pattern: /^[0-9a-fA-F]{24}$/]';
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              var domainConfig = DomainConfigsDP.generateOne(bogusAccountId);
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
        'with `bogus` origin host header.',
        function (done) {
          var bogusOriginHostHeader = '&&&&&';
          var transformedStr = '&amp;&amp;&amp;&amp;&amp;';
          var expMsg = 'child "origin_host_header" fails because ["origin_' +
            'host_header" with value "' + transformedStr + '" fails to ' +
            'match the required pattern: /(?=^.{4,253}$)(^((?!-)(?!\\_)[a-z' +
            'A-Z0-9-\\_]{0,62}[a-zA-Z0-9]\\.)+[a-zA-Z]{2,63}$)/]';
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              var domainConfig = DomainConfigsDP.generateOne(accountId);
              domainConfig.origin_host_header = bogusOriginHostHeader;
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

      /* TODO: BUG: Origin Server accepts bogus data like '&&&&&'. Returns 200*/
      xit('[BUG: Bogus input] should return `Bad Request` when ' +
        'trying to `create` domain config with `bogus` origin server.',
        function (done) {
          var bogusOriginServer = '&&&&&';
          var transformedStr = '&amp;&amp;&amp;&amp;&amp;';
          var expectedMsg = 'child "origin_server" fails because ["origin_' +
            'server" with value "' + transformedStr + '" fails to match the ' +
            'required pattern: //]';
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              var domainConfig = DomainConfigsDP.generateOne(accountId);
              domainConfig.origin_server = bogusOriginServer;
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
        'with `bogus` host server location id.',
        function (done) {
          var bogusLocationId = '&&&&&';
          var transformedStr = '&amp;&amp;&amp;&amp;&amp;';
          var expectedMsg = 'child "origin_server_location_id" fails because ' +
            '["origin_server_location_id" with value "' + transformedStr +
            '" fails to match the required pattern: /^[0-9a-fA-F]{24}$/]';
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              var domainConfig = DomainConfigsDP.generateOne(accountId);
              domainConfig.origin_server_location_id = bogusLocationId;
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

      /* TODO: BUG: Tolerance accepts bogus data like '&&&&&'. Returns 200*/
      xit('[BUG: Bogus input] should return `Bad Request` when ' +
        'trying to `create` domain config with `bogus` tolerance.',
        function (done) {
          var bogusTolerance = '&&&&&';
          var transformedStr = '&amp;&amp;&amp;&amp;&amp;';
          var expectedMsg = 'child "tolerance" fails because ["tolerance" ' +
            'with value "' + transformedStr + '" fails to match the required ' +
            'pattern://]';
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              var domainConfig = DomainConfigsDP.generateOne(accountId);
              domainConfig.tolerance = bogusTolerance;
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
        'status` with `bogus` id.',
        function (done) {
          var bogusDomainId = '&&&&&';
          var transformedStr = '&amp;&amp;&amp;&amp;&amp;';
          var expectedMsg = 'child \"domain_id\" fails because [\"domain_id' +
            '\" with value \"' + transformedStr + '\" fails to match the ' +
            'required pattern: /^[0-9a-fA-F]{24}$/]';
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              API.resources.domainConfigs
                .status(bogusDomainId)
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
        'configuration versions` with `bogus` id.',
        function (done) {
          var bogusDomainId = '&&&&&';
          var transformedStr = '&amp;&amp;&amp;&amp;&amp;';
          var expectedMsg = 'child \"domain_id\" fails because [\"domain_id' +
            '\" with value \"' + transformedStr + '\" fails to match the ' +
            'required pattern: /^[0-9a-fA-F]{24}$/]';
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              API.resources.domainConfigs
                .versions(bogusDomainId)
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
