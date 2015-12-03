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
var DomainConfigsDP = require('./../common/providers/data/domainConfigs');

describe('CRUD check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var account;
  var firstDc;
  var firstFdc;
  var secondDc;
  var reseller = config.get('api.users.reseller');

  before(function (done) {
    API
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
    API
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

  describe('Domain Configs resource', function () {

    beforeEach(function (done) {
      done();
    });

    afterEach(function (done) {
      done();
    });

    it('should allow to get all domain configs',
      function (done) {
        API
          .authenticateUser(reseller)
          .then(function () {
            API.resources.domainConfigs
              .getAll()
              .expect(200)
              .then(function (response) {
                var domainConfigs = response.body;
                var isDomainConfigInTheList = false;
                domainConfigs.length.should.be.greaterThanOrEqual(1);
                for (var i = 0, len = domainConfigs.length; i < len; i++) {
                  var domainConfigName = domainConfigs[i].domain_name;
                  if (domainConfigName === firstDc.domain_name) {
                    isDomainConfigInTheList = true;
                    break;
                  }
                }
                isDomainConfigInTheList.should.be.true();
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should allow to get one domain config',
      function (done) {
        API
          .authenticateUser(reseller)
          .then(function () {
            API.resources.domainConfigs
              .getOne(firstDc.id)
              .expect(200)
              .then(function (response) {
                firstFdc = response.body;
                firstFdc.account_id.should.equal(account.id);
                firstFdc.domain_name.should.equal(firstDc.domain_name);
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should allow to update existing domain config',
      function (done) {
        firstFdc.origin_host_header = 'UPDATED-' + firstFdc.origin_host_header;
        firstFdc.origin_server = 'UPDATED-' + firstFdc.origin_server;
        delete firstFdc.domain_name;
        delete firstFdc.cname;
        API
          .authenticateUser(reseller)
          .then(function () {
            API.resources.domainConfigs
              .update(firstDc.id, firstFdc)
              .expect(200)
              .then(function (res) {
                firstDc.id = res.body.object_id;
                res.body.message.should
                  .equal('Successfully saved the domain configuration');
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should allow to create new domain config',
      function (done) {
        secondDc = DomainConfigsDP.generateOne(account.id);
        API
          .authenticateUser(reseller)
          .then(function () {
            API.resources.domainConfigs
              .createOne(secondDc)
              .expect(200)
              .then(function (response) {
                secondDc.id = response.body.object_id;
                response.body.message.should
                  .equal('Successfully created new domain configuration');
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should allow to delete existing domain config',
      function (done) {
        API
          .authenticateUser(reseller)
          .then(function () {
            API.resources.domainConfigs
              .deleteOne(secondDc.id)
              .expect(200)
              .then(function (response) {
                secondDc.id = response.body.object_id;
                response.body.message.should
                  .equal('The domain has been scheduled for removal');
                done();
              })
              .catch(done);
          })
          .catch(done);
      });
  });
});
