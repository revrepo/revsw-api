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
var DomainConfigsDP = require('./../../common/providers/data/domainConfigs');

describe('Negative check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var commonAccount;
  var commonDomainConfig;
  var reseller = config.get('api.users.reseller');

  before(function (done) {
    API
      .authenticateUser(reseller)
      .then(function () {
        return API.helpers.accounts.createOne();
      })
      .then(function (account) {
        commonAccount = account;
        return API.helpers.domainConfigs.createOne(account.id);
      })
      .then(function (domainConfig) {
        commonDomainConfig = domainConfig;
      })
      .then(done)
      .catch(done);
  });

  after(function (done) {
    API
      .authenticateUser(reseller)
      .then(function () {
        return API.resources.domainConfigs.deleteOne(commonDomainConfig.id);
      })
      .then(function () {
        return API.resources.accounts.deleteAllPrerequisites(done);
      })
      .catch(done);
  });

  describe('Domain Configs resource', function () {

    beforeEach(function (done) {
      done();
    });

    afterEach(function (done) {
      done();
    });

    it('should return `Unauthorized` response when getting all domain ' +
      'configs without authorization.',
      function (done) {
        API.session.reset();
        API.resources.domainConfigs
          .getAll()
          .expect(401)
          .end(done);
      });

    it('should return `Unauthorized` response when getting one domain ' +
      'configs without authorization.',
      function (done) {
        API.session.reset();
        API.resources.domainConfigs
          .getOne(commonDomainConfig.id)
          .expect(401)
          .end(done);
      });

    it('should return `Unauthorized` response when creating new domain ' +
      'configs without authorization.',
      function (done) {
        var newDomainConfig = DomainConfigsDP.generateOne(commonAccount.id);
        API.session.reset();
        API.resources.domainConfigs
          .createOne(newDomainConfig)
          .expect(401)
          .end(done);
      });

    it('should return `Unauthorized` response when updating a domain config ' +
      'without authorization.',
      function (done) {
        var updatedDomainConfig = DomainConfigsDP.generateOne(commonAccount.id);
        API.session.reset();
        API.resources.domainConfigs
          .update(commonDomainConfig.id, updatedDomainConfig)
          .expect(401)
          .end(done);
      });

    it('should return `Unauthorized` response when deleting a domain config ' +
      'without authorization.',
      function (done) {
        API.session.reset();
        API.resources.domainConfigs
          .deleteOne(commonDomainConfig.id)
          .expect(401)
          .end(done);
      });

    it('should return `Bad Request` when trying to get `domain publishing ' +
      'status` without authorization.',
      function (done) {
        API.session.reset();
        API.resources.domainConfigs
          .status(commonDomainConfig.id)
          .getOne()
          .expect(401)
          .end(done);
      });

    it('should return `Bad Request` when trying to get `domain configuration ' +
      'versions` without authorization.',
      function (done) {
        API.session.reset();
        API.resources.domainConfigs
          .versions(commonDomainConfig.id)
          .getAll()
          .expect(401)
          .end(done);
      });
  });
});
