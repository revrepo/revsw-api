/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2016] Rev Software, Inc.
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

describe('CRUD check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  // Defining set of users for which all below tests will be run
  var users = [
    config.get('api.users.revAdmin'),
    config.get('api.users.reseller')
  ];

  users.forEach(function (user) {

    var account;
    var firstDc;
    var firstFdc;
    var secondDc;

    describe('With user: ' + user.role, function () {

      describe('Domain Configs resource', function () {

        before(function (done) {
          API.identity
            .authenticate(user)
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

        beforeEach(function (done) {
          done();
        });

        afterEach(function (done) {
          done();
        });

        it('should allow to get all domain configs',
          function (done) {
            API.identity
              .authenticate(user)
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
                      if (domainConfigName === firstDc.domain_name.toLowerCase()) {
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
            API.identity
              .authenticate(user)
              .then(function () {
                API.resources.domainConfigs
                  .getOne(firstDc.id)
                  .expect(200)
                  .then(function (response) {
                    firstFdc = response.body;
                    firstFdc.account_id.should.equal(account.id);
                    firstFdc.domain_name.should.equal(firstDc.domain_name.toLowerCase());
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });

        it('should allow to create new domain config',
          function (done) {
            secondDc = DomainConfigsDP.generateOne(account.id);
            API.identity
              .authenticate(user)
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

        it('should allow to update existing domain config',
          function (done) {
            firstFdc.origin_host_header = 'EDIT-' + firstFdc.origin_host_header;
            firstFdc.origin_server = 'EDIT-' + firstFdc.origin_server;
            delete firstFdc.domain_name;
            delete firstFdc.cname;
            delete firstFdc.published_domain_version;
            delete firstFdc.last_published_domain_version;
            API.identity
              .authenticate(user)
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

        it('should allow to get status of existing domain config',
          function (done) {
            API.identity
              .authenticate(user)
              .then(function () {
                API.resources.domainConfigs
                  .status(secondDc.id)
                  .getOne()
                  .expect(200)
                  .then(function (response) {
                    response.body.staging_status.should.not.be.undefined();
                    response.body.global_status.should.not.be.undefined();
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });

        it('should allow to get versions of existing domain config',
          function (done) {
            API.identity
              .authenticate(user)
              .then(function () {
                API.resources.domainConfigs
                  .versions(secondDc.id)
                  .getAll()
                  .expect(200)
                  .then(function (response) {
                    var firstVer = response.body[0];
                    firstVer.id.should.equal(secondDc.id);
                    firstVer.domain_name.should.equal(secondDc.domain_name.toLowerCase());
                    firstVer.origin_server.should.equal(secondDc.origin_server);
                    firstVer.origin_host_header.should
                      .equal(secondDc.origin_host_header);
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });

        it('should allow to delete existing domain config',
          function (done) {
            API.identity
              .authenticate(user)
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
  });
});
