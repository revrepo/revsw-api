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
// # Functional check: API Keys
var config = require('config');
var _ = require('lodash');
var API = require('./../../common/api');
var DataProvider = require('./../../common/providers/data');
var AccountsDP = require('./../../common/providers/data/accounts');
var APIKeyDataProvider = require('./../../common/providers/data/apiKeys');

describe('Functional check', function () {
  this.timeout(config.get('api.request.maxTimeout'));
  var resellerUser = config.get('api.users.reseller');
  var accountFirst, accountSecond, accountForDelete;
  var userReseller = DataProvider.generateUser('reseller');

  before(function (done) {
    API.helpers
      .authenticateUser(config.api.users.revAdmin)
      .then(function () {
        // create account 1
        accountFirst = AccountsDP.generateOne();
        return API.resources.accounts
          .createOne(accountFirst)
          .then(function (response) {
            accountFirst.id = response.body.object_id;
            return accountFirst;
          });
      })
      .then(function () {
        // create user with role "resseler" and access to Account First and Account Second
        userReseller.account_id = accountFirst.id;
        userReseller.access_control_list.readOnly = false;
        API.resources.users
          .createOne(userReseller)
          .then(function (res) {                        
            API.authenticate(userReseller)
            .then(function () {
              API.helpers.accounts.createOne(AccountsDP.generateOne())
                .then(function (acc) {
                  accountSecond = acc;
                  API.helpers.accounts.createOne(AccountsDP.generateOne())
                    .then(function (acc2) {
                      accountForDelete = acc2;
                      done();
                    })
                    .catch(done);
                })
                .catch(done);
            });
          })
          .catch(done);
      })
      .catch(done);
  });

  after(function (done) {
    done();
  });

  describe('API Keys resource', function () {
    var apiKey;
    before(function (done) {
      API.helpers.authenticateUser(userReseller)
        .then(function () {
          // create API Key for Account 1
            return API.helpers.apiKeys.createOneForAccount(accountFirst)
            .then(function (response) {
              apiKey = response;
              return apiKey;
            });      
        })
        .then(function () {
          done();
        });
    });

    after(function (done) {
      done();
    });

    it('should provide access to main account', function (done) {
      API.helpers.authenticateAPIKey(apiKey.id)
        .then(function (user) {
          API.resources.accounts
            .getOne(accountFirst.id)
            .expect(200)
            .then(function (response) {
              var accountObject = response.body;
              accountObject.id.should.equal(accountFirst.id);
              done();
            });
        })
        .catch(done);
    });

    it('should provide access only one account', function (done) {
      API.helpers.authenticateAPIKey(apiKey.id)
        .then(function () {
          API.resources.accounts
            .getAll()
            .expect(200)
            .then(function (response) {
              var accountsArray = response.body;
              accountsArray.length.should.equal(1);
              accountsArray[0].id.should.equal(accountFirst.id);
              done();
            })
            .catch(done);
        })
        .catch(done);
    });

    it('should have no access to another account', function (done) {
      API.helpers.authenticateAPIKey(apiKey.id)
        .then(function () {
          API.resources.accounts
            .getOne(accountSecond.id)
            .expect(400)
            .end(function (err, res) {
              res.body.message.should.equal('Account ID not found');
              done();
            });
        })
        .catch(done);
    });

    describe('with additional account', function () {
      before(function (done) {

        API.helpers.authenticateUser(userReseller)
          .then(function () {
            // add to API Key additional Account 2
            var updatedKey = APIKeyDataProvider
              .generateCompleteOne(apiKey.account_id);
            updatedKey.managed_account_ids = [accountSecond.id];
            API.resources.apiKeys
              .update(apiKey.id, updatedKey)
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

      after(function (done) {
        done();
      });

      it('should provide access to specified additional account', function (done) {
        API.helpers.authenticateAPIKey(apiKey.id)
          .then(function () {
            API.resources.accounts
              .getOne(accountSecond.id)
              .expect(200)
              .then(function (response) {
                var accountObject = response.body;
                accountObject.id.should.equal(accountSecond.id);
                done();
              });
          })
          .catch(done);
      });

      it('should provide access to main and additional account', function (done) {
        API.helpers.authenticateAPIKey(apiKey.id)
          .then(function () {
            API.resources.accounts
              .getAll()
              .expect(200)
              .then(function (response) {
                var accountsArray = response.body;
                accountsArray.length.should.equal(2);
                accountsArray.should.matchEach(function(item){
                  return (item.id === accountFirst.id) || (item.id === accountSecond.id);
                });
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

      describe('after delete additional account', function () {
        before(function (done) {
          // remove account 2 from apikey
          API.helpers.authenticateUser(userReseller)
            .then(function () {
              // remove form API Key access to additional Account 2
              var updatedKey = APIKeyDataProvider
                .generateCompleteOne(apiKey.account_id);
              updatedKey.managed_account_ids = [];
              API.resources.apiKeys
                .update(apiKey.id, updatedKey)
                .expect(200)
                .end(done);
            })
            .catch(done);
        });

        after(function (done) {
          done();
        });

        it('should provide access to main account', function (done) {
          API.helpers.authenticateAPIKey(apiKey.id)
            .then(function () {
              API.resources.accounts
                .getOne(accountFirst.id)
                .expect(200)
                .then(function (response) {
                  var accountsObject = response.body;
                  accountsObject.id.should.equal(accountFirst.id);
                  done();
                })
                .catch(done);
            })
            .catch(done);
        });

        it('should have no access to additional account', function (done) {
          API.helpers.authenticateAPIKey(apiKey.id)
            .then(function () {
              API.resources.accounts
                .getOne(accountSecond.id)
                .expect(400)
                .end(function (err, res) {
                  res.body.message.should.equal('Account ID not found');
                  done();
                });
            })
            .catch(done);
        });

        it('should get only one account', function (done) {
          API.helpers.authenticateAPIKey(apiKey.id)
            .then(function () {
              API.resources.accounts
                .getAll()
                .expect(200)
                .then(function (response) {
                  var accountsArray = response.body;
                  accountsArray.length.should.equal(1);
                  accountsArray[0].id.should.equal(accountFirst.id);
                  done();
                })
                .catch(done);
            })
            .catch(done);
        });
      });
    });

    describe('with additional account which will be delete', function() {
        before(function(done) {
          API.helpers.authenticateUser(userReseller)
            .then(function() {
              // add to API Key additional Account For Delete
              var updatedKey = APIKeyDataProvider
                .generateCompleteOne(apiKey.account_id);
              updatedKey.managed_account_ids = [accountForDelete.id];
              API.resources.apiKeys
                .update(apiKey.id, updatedKey)
                .expect(200)
                .end(done);
            })
            .catch(done);
        });

        after(function(done) {
          done();
        });

        it('should provide access to additional account which exisit and will be delete', function(done) {
          API.helpers.authenticateAPIKey(apiKey.id)
            .then(function() {
              API.resources.accounts
                .getOne(accountForDelete.id)
                .expect(200)
                .then(function(response) {
                  var accountObject = response.body;
                  accountObject.id.should.equal(accountForDelete.id);
                  done();
                });
            })
            .catch(done);
        });

        it('should no contain account ID in managed_account_ids after account was deleted', function(done) {
          API.helpers.authenticateUser(userReseller)
            .then(function() {
              API.resources.accounts
                .deleteOne(accountForDelete.id)
                .then(function() {
                  API.resources.accounts
                    .getOne(accountForDelete.id)
                    .expect(400)
                    .end(function(err, res) {
                      res.body.message.should.equal('Account ID not found');
                      API.resources.apiKeys
                        .getOne(apiKey.id)
                        .expect(200)
                        .end(function(err, res) {
                          res.body.should.have.property('managed_account_ids');
                          res.body.managed_account_ids.should.be.instanceof(Array);
                          res.body.managed_account_ids.should.not.containEql(accountForDelete.id);
                          done();
                        });
                    });
                });
            })
            .catch(done);
        });

    });
  });
});
