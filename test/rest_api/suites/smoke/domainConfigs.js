/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2017] Rev Software, Inc.
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
var API= require('./../../common/api');
var DomainConfigsDP= require('./../../common/providers/data/domainConfigs');

describe('Smoke check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var account;
  var firstDc;
  var firstFdc;
  var secondDc;
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
      .then(function (domainConfig) {
        firstDc = domainConfig;
      })
      .then(done)
      .catch(done);
  });

  after(function (done) {
    done();
  });

  describe('Domain configs resource', function () {

    beforeEach(function (done) {
      done();
    });

    afterEach(function (done) {
      done();
    });

    it('should return success response data when getting a recommended default settings',
      function(done) {
        API.identity
          .authenticate(reseller)
          .then(function() {
            API.resources.domainConfigs
              .recommendedDefaultSettings()
              .getAll()
              .expect(200)
              .then(function(res){
                var defaultSettings = res.body;
                defaultSettings.should.have.property('waf_rules_ids');
                defaultSettings.should.have.property('ssl_conf_profile_id');
                defaultSettings.waf_rules_ids.should.be.instanceof(Array);
                defaultSettings.waf_rules_ids.should.not.empty;
                defaultSettings.ssl_conf_profile_id.should.be.type('string');
                defaultSettings.ssl_conf_profile_id.should.not.empty;
              })
              .then(function(){
                done();
              });
          })
          .catch(done);
      });

    it('should return success response code when getting a list of domains',
      function (done) {
        API.identity
          .authenticate(reseller)
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
        API.identity
          .authenticate(reseller)
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
        API.identity
          .authenticate(reseller)
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
        delete firstFdc.published_domain_version;
        delete firstFdc.last_published_domain_version;
        delete firstFdc.cname;
        API.identity
          .authenticate(reseller)
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
        API.identity
          .authenticate(reseller)
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
        API.identity
          .authenticate(reseller)
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
        API.identity
          .authenticate(reseller)
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
        API.identity
          .authenticate(reseller)
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
        API.identity
          .authenticate(reseller)
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
        API.identity
          .authenticate(reseller)
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
        API.identity
          .authenticate(reseller)
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
