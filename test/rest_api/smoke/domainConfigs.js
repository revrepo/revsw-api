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

var config = require('config');
var API = require('./../common/api');
var DomainConfigsDP = require('./../common/providers/data/domainConfigs');

describe('Smoke check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var account;
  var firstDc;
  var firstFdc;
  var secondDc;
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
      .then(function (domainConfig) {
        firstDc = domainConfig;
      })
      .then(done)
      .catch(done);
  });

  after(function (done) {
    API.helpers
      .authenticateUser(reseller)
      // TODO: BUG? Cannot delete DomainConfig right after updating it.
      //.then(function () {
      //  return API.resources.domainConfigs.deleteOne(firstDc.id);
      //})
      .then(function () {
        return API.resources.accounts.deleteAllPrerequisites(done);
      })
      .catch(done);
  });

  describe('Domain configs resource', function () {

    beforeEach(function (done) {
      done();
    });

    afterEach(function (done) {
      done();
    });

    it('should return success response code when getting a list of domains',
      function (done) {
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            API.resources.domainConfigs
              .getAll()
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

    it('should return success response code when creating a new domain',
      function (done) {
        secondDc = DomainConfigsDP.generateOne(account.id);
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            API.resources.domainConfigs
              .createOne(secondDc)
              .expect(200)
              .then(function (response) { // This is needed for the next tests
                secondDc.id = response.body.object_id;
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should return success response code when getting a specific domain',
      function (done) {
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            API.resources.domainConfigs
              .getOne(firstDc.id)
              .expect(200)
              .then(function (response) { // This is needed for the next tests
                firstFdc = response.body;
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should return success response code when updating a domain',
      function (done) {
        firstFdc.origin_host_header = 'UPDATED-' + firstFdc.origin_host_header;
        firstFdc.origin_server = 'UPDATED-' + firstFdc.origin_server;
        delete firstFdc.domain_name;
        delete firstFdc.cname;
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            API.resources.domainConfigs
              .update(firstDc.id, firstFdc)
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

    it('should return success response code when updating a domain to ' +
      '`verify only`',
      function (done) {
        firstFdc.origin_host_header = 'VERIFY-' + firstFdc.origin_host_header;
        firstFdc.origin_server = 'VERIFY-' + firstFdc.origin_server;
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            API.resources.domainConfigs
              .update(firstDc.id, firstFdc, {options: 'verify_only'})
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

    it('should return success response code when updating a domain to ' +
      '`publish`',
      function (done) {
        firstFdc.origin_host_header = 'PUBLISH-' + firstFdc.origin_host_header;
        firstFdc.origin_server = 'PUBLISH-' + firstFdc.origin_server;
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            API.resources.domainConfigs
              .update(firstDc.id, firstFdc, {options: 'publish'})
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

    it('should return success response code when getting the status of ' +
      'existing domain config',
      function (done) {
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            API.resources.domainConfigs
              .status(secondDc.id)
              .getOne()
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

    it('should return success response code when getting versions of ' +
      'existing domain config',
      function (done) {
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            API.resources.domainConfigs
              .versions(secondDc.id)
              .getAll()
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

    it('should return success response code when getting specific versions ' +
      'for an specific existing domain config',
      function (done) {
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            API.resources.domainConfigs
              .getOne(firstDc.id, {version: 1})
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

    it('should return success response code when getting specific versions ' +
      'for an specific existing domain config',
      function (done) {
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            API.resources.domainConfigs
              .getOne(firstDc.id, {version: 2})
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

    it('should return success response code when deleting a domain',
      function (done) {
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            API.resources.domainConfigs
              .deleteOne(secondDc.id)
              .expect(200)
              .end(done);
          })
          .catch(done);
      });
  });
});
