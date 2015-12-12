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
var API = require('./../common/api');
var AccountsDP = require('./../common/providers/data/accounts');
var DomainConfigsDP = require('./../common/providers/data/domainConfigs');

describe('Boundary check', function () {

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

    beforeEach(function (done) {
      done();
    });

    afterEach(function (done) {
      done();
    });

    it('should return `Bad Request` when trying to `create` domain config ' +
      'with `long` name.',
      function (done) {
        var longDomainName = 'LongDomainNameLongDomainNameLongDomainNameLong' +
          'DomainNameLongDomainNameLongDomainNameLongDomainNameLongDomainName' +
          'LongDomainNameLongDomainNameLongDomainNameLongDomainNameLongDomain' +
          'NameLongDomainNameLongDomainNameLongDomainNameLongDomainName';
        var expectedMsg = 'child "domain_name" fails because ["domain_name" ' +
          'with value "' + longDomainName + '" fails to match the required ' +
          'pattern: /(?=^.{4,253}$)(^((?!-)(?!\\_)[a-zA-Z0-9-\\_]{0,62}[a-z' +
          'A-Z0-9]\\.)+[a-zA-Z]{2,63}$)/]';
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            var domainConfig = DomainConfigsDP.generateOne(accountId);
            domainConfig.domain_name = longDomainName;
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
      'with `long` account id.',
      function (done) {
        var longAccountId = 'abcdef01234567890123456789';
        var expectedMsg = 'child "account_id" fails because ["account_id" ' +
          'with value "' + longAccountId + '" fails to match the required ' +
          'pattern: /^[0-9a-fA-F]{24}$/]';
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            var domainConfig = DomainConfigsDP.generateOne(longAccountId);
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
      'with `long` origin host header.',
      function (done) {
        var longOriginHostHeader = 'LongHostHeaderLongHostHeaderLongHost' +
          'HeaderLongHostHeaderLongHostHeaderLongHostHeaderLongHostHeaderLong' +
          'HostHeaderHostHeaderLongHostHeaderLongHostHeaderLongHostHeader';
        var expectedMsg = 'child "origin_host_header" fails because ["origin_' +
          'host_header" with value "' + longOriginHostHeader + '" fails to ' +
          'match the required pattern: /(?=^.{4,253}$)(^((?!-)(?!\\_)[a-zA-Z' +
          '0-9-\\_]{0,62}[a-zA-Z0-9]\\.)+[a-zA-Z]{2,63}$)/]';
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            var domainConfig = DomainConfigsDP.generateOne(accountId);
            domainConfig.origin_host_header = longOriginHostHeader;
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
      'with `long` origin server.',
      function (done) {
        var longOriginServer = 'LongOriginServerLongOriginServerLongOrigin' +
          'ServerLongOriginServerLongOriginServerLongOriginServerLongOrigin' +
          'ServerLongOriginServerLongOriginServerLongOriginServerLongOrigin' +
          'ServerLongOriginServerLongOriginServer';
        var expectedMsg = 'child "origin_server" fails because ["origin_server" with value "' +
          longOriginServer + '" fails to match the required pattern: /(?=^.{4,253}$)(^((?!-)(?!\\_)[a-zA-Z0-9-\\_]' +
          '{0,62}[a-zA-Z0-9]\\.)+[a-zA-Z]{2,63}$)/, "origin_server" with value "' + longOriginServer +
          '" fails to match the required pattern: /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\\.){3}' +
          '([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/]';
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            var domainConfig = DomainConfigsDP.generateOne(accountId);
            domainConfig.origin_server = longOriginServer;
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
      'with `long` host server location id.',
      function (done) {
        var longLocationId = 'abcdef01234567890123456789';
        var expectedMsg = 'child "origin_server_location_id" fails because ["' +
          'origin_server_location_id" with value "' + longLocationId + '" ' +
          'fails to match the required pattern: /^[0-9a-fA-F]{24}$/]';
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            var domainConfig = DomainConfigsDP.generateOne(accountId);
            domainConfig.origin_server_location_id = longLocationId;
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
      'with `long` tolerance.',
      function (done) {
        var longTolerance = '9876543210987654321098765432109876543210987654321';
        var expectedMsg = 'child "tolerance" fails because ["tolerance" length must be less than ' +
          'or equal to 10 characters long]';
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            var domainConfig = DomainConfigsDP.generateOne(accountId);
            domainConfig.tolerance = longTolerance;
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
      'status` with `long` id value.',
      function (done) {
        var longDomainId = 'abcdef01234567890123456789';
        var expectedMsg = 'child \"domain_id\" fails because [\"domain_id\" ' +
          'with value \"' + longDomainId + '\" fails to match the required ' +
          'pattern: /^[0-9a-fA-F]{24}$/]';
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            API.resources.domainConfigs
              .status(longDomainId)
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
      'versions` with `long` id value.',
      function (done) {
        var longDomainId = 'abcdef01234567890123456789';
        var expectedMsg = 'child \"domain_id\" fails because [\"domain_id\" ' +
          'with value \"' + longDomainId + '\" fails to match the required ' +
          'pattern: /^[0-9a-fA-F]{24}$/]';
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            API.resources.domainConfigs
              .versions(longDomainId)
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
