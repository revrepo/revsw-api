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
var API = require('./../../../common/api');
var AccountsDP = require('./../../../common/providers/data/accounts');
var DomainConfigsDP = require('./../../../common/providers/data/domainConfigs');

describe('Domain configs functional test', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var account;
  var secondAccount;
  var otherAccount;
  var firstDc;
  var firstFdc;
  var secondDc;
  var originServerV1;
  var originServerV2;
  var user = config.get('api.users.reseller');
  var secondReseller = config.get('api.users.secondReseller');
  var revAdmin = config.get('api.users.revAdmin');

  before(function (done) {
    API.identity
      .authenticate(secondReseller)
      .then(function () {
        return API.helpers.accounts.createOne();
      })
      .then(function (newAccount) {
        otherAccount = newAccount;
        API.identity
          .authenticate(user)
          .then(function () {
            return API.helpers.accounts.createOne();
          })
          .then(function (newAccount) {
            account = newAccount;
            return API.helpers.accounts.createOne();
          })
          .then(function (newAccount) {
            secondAccount = newAccount;
            return API.helpers.domainConfigs.createOne(account.id);
          })
          .then(function (domainConfig) {
            firstDc = domainConfig;
          })
          .then(done)
          .catch(done);
      })
      .catch(done);
  });

  after(function (done) {
    API.identity
      .authenticate(secondReseller)
      .then(function () {
        API.resources.accounts.deleteOne(otherAccount.id);
        done();
      })
      .catch(done);
  });

  describe('Domain configs resource', function () {

    it('should not be able to create domain using account from other customer',
      function (done) {
        var domainConfig = DomainConfigsDP.generateOne(otherAccount.id);
        API.identity
          .authenticate(user)
          .then(function () {
            API.resources.domainConfigs
              .createOne(domainConfig)
              .expect(400)
              .then(function (response) {
                response.body.message.should.equal('Account ID not found');
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should return staging and global status as `In Progress` right after ' +
      'create a domain config',
      function (done) {
        var counter = 600000; // NOTE: 10 mins
        var interval = 1000;
        var cb = function () {
          if (counter < 0) {
            done(new Error('Timeout: waiting domain-status to change.'));
          }
          counter -= interval;
          API.resources.domainConfigs
            .status(firstDc.id)
            .getOne()
            .expect(200)
            .then(function (response) {
              if (response.body.global_status !== 'InProgress') {
                setTimeout(cb, interval);
                return;
              }
              response.body.staging_status.should.equal('InProgress');
              response.body.global_status.should.equal('InProgress');
              done();
            })
            .catch(done);
        };
        API.identity
          .authenticate(user)
          .then(function () {
            setTimeout(cb, interval);
          })
          .catch(done);
      });

    it('should return staging and global status as `Published` after some ' +
      'time a domain config was created',
      function (done) {
        secondDc = DomainConfigsDP.generateOne(account.id);
        originServerV1 = secondDc.origin_server;
        API.identity
          .authenticate(user)
          .then(function () {
            var counter = 600000; // NOTE: 10 mins
            var interval = 1000;
            var cb = function () {
              if (counter < 0) {
                done(new Error('Timeout: waiting domain-status to change.'));
              }
              counter -= interval;
              API.resources.domainConfigs
                .status(secondDc.id)
                .getOne()
                .expect(200)
                .then(function (response) {
                  if (response.body.staging_status !== 'Published' ||
                    response.body.global_status !== 'Published') {
                    setTimeout(cb, interval);
                    return;
                  }
                  response.body.staging_status.should.equal('Published');
                  response.body.global_status.should.equal('Published');
                  done();
                })
                .catch(done);
            };
            API.resources.domainConfigs
              .createOne(secondDc)
              .expect(200)
              .then(function (response) { // This is needed for the next tests
                secondDc.id = response.body.object_id;
              })
              .then(function () {
                setTimeout(cb, interval);
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should not allow to create a domain when sending existing `domain-' +
      'name` value in `domain_aliases` field',
      function (done) {
        var newDomain = DomainConfigsDP.generateOne(account.id);
        newDomain.domain_aliases = secondDc.domain_name;
        API.identity
          .authenticate(user)
          .then(function () {
            API.resources.domainConfigs
              .createOne(newDomain)
              .expect(400)
              .then(function (response) { // This is needed for the next tests
                var expMsg = '"domain_aliases" is not allowed';
                response.body.message.should.equal(expMsg);
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should not allow to create a domain  when sending existing `domain-' +
      'name` value in `domain_wildcard_alias` field',
      function (done) {
        var newDomain = DomainConfigsDP.generateOne(account.id);
        newDomain.domain_wildcard_alias = secondDc.domain_name;
        API.identity
          .authenticate(user)
          .then(function () {
            API.resources.domainConfigs
              .createOne(newDomain)
              .expect(400)
              .then(function (response) { // This is needed for the next tests
                var expMsg = '"domain_wildcard_alias" is not allowed';
                response.body.message.should.equal(expMsg);
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should allow to get `version 1` of recently created domain config',
      function (done) {
        API.identity
          .authenticate(user)
          .then(function () {
            API.resources.domainConfigs
              .getOne(firstDc.id, {version: 1})
              .expect(200)
              .then(function (res) {
                res.body.origin_server.should.equal(originServerV1);
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should allow to get `version 2` of recently updated domain config',
      function (done) {
        API.identity
          .authenticate(user)
          .then(function () {
            API.resources.domainConfigs
              .getOne(firstDc.id)
              .expect(200)
              .then(function (response) { // This is needed for the next tests
                firstFdc = response.body;
              })
              .then(function () {
                firstFdc.origin_host_header = 'PUBLISH-' +
                  firstFdc.origin_host_header;
                firstFdc.origin_server = 'PUBLISH-' + firstFdc.origin_server;
                originServerV2 = firstFdc.origin_server;
                delete firstFdc.domain_name;
                delete firstFdc.cname;
                delete firstFdc.published_domain_version;
                delete firstFdc.last_published_domain_version;
                var counter = 600000; // NOTE: 10 mins
                var interval = 1000;
                var cb = function () {
                  if (counter < 0) {
                    done(new Error('Timeout: waiting domain-status to change.'));
                  }
                  counter -= interval;
                  API.resources.domainConfigs
                    .getOne(firstDc.id, {version: 2})
                    .expect(200)
                    .then(function (res) {
                      if (res.body.origin_server !== originServerV2) {
                        setTimeout(cb, interval);
                        return;
                      }
                      res.body.origin_server.should.equal(originServerV2);
                      done();
                    })
                    .catch(done);
                };
                API.resources.domainConfigs
                  .update(firstDc.id, firstFdc, {options: 'publish'})
                  .expect(200)
                  .then(function () {
                    setTimeout(cb, interval);
                  })
                  .catch(done);
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should not be able to update domain using account from other customer',
      function (done) {
        var domainConfig = DomainConfigsDP.cloneForUpdate(firstFdc);
        domainConfig.account_id = otherAccount.id;
        API.identity
          .authenticate(user)
          .then(function () {
            API.resources.domainConfigs
              .update(firstDc.id, domainConfig)
              .expect(400)
              .then(function (response) {
                response.body.message.should.equal('Account ID not found');
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should return global status as `Modified` right after modifying the ' +
      'domain config',
      function (done) {
        API.identity
          .authenticate(user)
          .then(function () {
            var counter = 600000; // NOTE: 10 mins
            var interval = 1000;
            var cb = function () {
              if (counter < 0) {
                done(new Error('Timeout: waiting domain-status to change.'));
              }
              counter -= interval;
              API.resources.domainConfigs
                .status(firstDc.id)
                .getOne()
                .expect(200)
                .then(function (response) {
                  if (response.body.global_status !== 'Modified') {
                    setTimeout(cb, interval);
                    return;
                  }
                  response.body.global_status.should.equal('Modified');
                  done();
                })
                .catch(done);
            };
            API.resources.domainConfigs
              .update(firstDc.id, firstFdc)
              .expect(200)
              .then(function () {
                setTimeout(cb, interval);
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should return recently modified domain config',
      function (done) {
        API.identity
          .authenticate(user)
          .then(function () {
            API.resources.domainConfigs
              .getOne(firstDc.id)
              .expect(200)
              .then(function (response) {
                response.body.domain_name.should.equal(firstDc.domain_name.toLowerCase());
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should return recently modified domain config in the domain-list',
      function (done) {
        API.identity
          .authenticate(user)
          .then(function () {
            API.resources.domainConfigs
              .getAll()
              .expect(200)
              .then(function (response) {
                response.body.forEach(function (domain) {
                  if (domain.id === firstDc.id) {
                    domain.domain_name.should.equal(firstDc.domain_name.toLowerCase());
                  }
                });
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should return global status as `Published` right after publishing a ' +
      'modified domain config',
      function (done) {
        API.identity
          .authenticate(user)
          .then(function () {
            var counter = 600000; // NOTE: 10 mins
            var interval = 1000;
            var cb = function () {
              if (counter < 0) {
                done(new Error('Timeout: waiting domain-status to change.'));
              }
              counter -= interval;
              API.resources.domainConfigs
                .status(firstDc.id)
                .getOne()
                .expect(200)
                .then(function (response) {
                  if (response.body.global_status !== 'Published') {
                    setTimeout(cb, interval);
                    return;
                  }
                  response.body.global_status.should.equal('Published');
                  done();
                })
                .catch(done);
            };
            API.resources.domainConfigs
              .update(firstDc.id, firstFdc, {options: 'publish'})
              .expect(200)
              .then(function () {
                setTimeout(cb, interval);
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should return recently published domain config',
      function (done) {
        API.identity
          .authenticate(user)
          .then(function () {
            API.resources.domainConfigs
              .getOne(firstDc.id)
              .expect(200)
              .then(function (response) {
                response.body.domain_name.should.equal(firstDc.domain_name.toLowerCase());
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should return recently published domain config in the domain-list',
      function (done) {
        API.identity
          .authenticate(user)
          .then(function () {
            API.resources.domainConfigs
              .getAll()
              .expect(200)
              .then(function (response) {
                response.body.forEach(function (domain) {
                  if (domain.id === firstDc.id) {
                    domain.domain_name.should.equal(firstDc.domain_name);
                  }
                });
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should return global status as `Modified` right after verifying a ' +
      'modified domain config',
      function (done) {
        API.identity
          .authenticate(user)
          .then(function () {
            var counter = 600000; // NOTE: 10 mins
            var interval = 1000;
            var cb = function () {
              if (counter < 0) {
                done(new Error('Timeout: waiting domain-status to change.'));
              }
              counter -= interval;
              API.resources.domainConfigs
                .status(firstDc.id)
                .getOne()
                .expect(200)
                .then(function (response) {
                  if (response.body.global_status !== 'Modified') {
                    setTimeout(cb, interval);
                    return;
                  }
                  response.body.global_status.should.equal('Modified');
                  done();
                })
                .catch(done);
            };
            API.resources.domainConfigs
              .update(firstDc.id, firstFdc)
              .expect(200)
              .then(function () {
                API.resources.domainConfigs.update(firstDc.id, firstFdc, {options: 'verify_only'})
                .expect(200)
                .then(function () {
                  setTimeout(cb, interval);
                })
                .catch(done);
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should return recently verified domain config',
      function (done) {
        API.identity
          .authenticate(user)
          .then(function () {
            API.resources.domainConfigs
              .getOne(firstDc.id)
              .expect(200)
              .then(function (response) {
                response.body.domain_name.should.equal(firstDc.domain_name);
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should return recently verified domain config in the domain-list',
      function (done) {
        API.identity
          .authenticate(user)
          .then(function () {
            API.resources.domainConfigs
              .getAll()
              .expect(200)
              .then(function (response) {
                response.body.forEach(function (domain) {
                  if (domain.id === firstDc.id) {
                    domain.domain_name.should.equal(firstDc.domain_name);
                  }
                });
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should not create domain-config with already existing ' +
      'domain-config data',
      function (done) {
        var secondDcClone = JSON.parse(JSON.stringify(secondDc));
        delete secondDcClone.id;
        API.identity
          .authenticate(user)
          .then(function () {
            API.resources.domainConfigs
              .createOne(secondDcClone)
              .expect(400)
              .then(function (response) { // This is needed for the next tests
                response.body.message.should
                  .equal('The domain name is already registered in the system');
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should allow to change domain ownership to another company for same ' +
      'reseller user',
      function (done) {
        var updatedDc = DomainConfigsDP.cloneForUpdate(firstFdc);
        updatedDc.account_id = secondAccount.id;
        var counter = 600000; // NOTE: 10 mins
        var interval = 1000;
        var callBack = function () {
          if (counter < 0) {
            done(new Error('Timeout: waiting domain-status to change.'));
          }
          counter -= interval;
          API.resources.domainConfigs
            .status(firstDc.id)
            .getOne()
            .expect(200)
            .then(function (response) {
              if (response.body.staging_status !== 'Published') {
                setTimeout(callBack, interval);
                return;
              }
              API.resources.domainConfigs
                .getOne(firstDc.id)
                .expect(200)
                .then(function (res) {
                  var newDc = res.body;
                  newDc.account_id.should.equal(updatedDc.account_id);
                  newDc.domain_name.should.equal(firstDc.domain_name);
                  done();
                })
                .catch(done);
            })
            .catch(done);
        };
        // Test
        API.identity
          .authenticate(user)
          .then(function () {
            return API.resources.domainConfigs
              .update(firstDc.id, updatedDc)
              .expect(200)
              .then()
              .catch(done);
          })
          .then(function () {
            API.identity
              .authenticate(user)
              .then(function () {
                setTimeout(callBack, interval);
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should allow to change domain ownership to another company as Rev ' +
      'Admin user',
      function (done) {
        var updatedDc = DomainConfigsDP.cloneForUpdate(firstFdc);
        updatedDc.account_id = otherAccount.id;
        var counter = 600000; // NOTE: 10 mins
        var interval = 1000;
        var callBack = function () {
          if (counter < 0) {
            done(new Error('Timeout: waiting domain-status to change.'));
          }
          counter -= interval;
          API.resources.domainConfigs
            .status(firstDc.id)
            .getOne()
            .expect(200)
            .then(function (response) {
              if (response.body.staging_status !== 'Published') {
                setTimeout(callBack, interval);
                return;
              }
              API.resources.domainConfigs
                .getOne(firstDc.id)
                .expect(200)
                .then(function (res) {
                  var newDc = res.body;
                  newDc.account_id.should.equal(updatedDc.account_id);
                  newDc.domain_name.should.equal(firstDc.domain_name);
                  done();
                })
                .catch(done);
            })
            .catch(done);
        };
        // Test
        API.identity
          .authenticate(revAdmin)
          .then(function () {
            return API.resources.domainConfigs
              .update(firstDc.id, updatedDc)
              .expect(200)
              .then()
              .catch(done);
          })
          .then(function () {
            API.identity
              .authenticate(secondReseller)
              .then(function () {
                setTimeout(callBack, interval);
              })
              .catch(done);
          })
          .catch(done);
      });
  });
});
