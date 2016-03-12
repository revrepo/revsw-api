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
var accounts= require('./../../../common/resources/accounts');
var API= require('./../../../common/api');
var AccountsDP= require('./../../../common/providers/data/accounts');

describe('Functional check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var resellerUser = config.get('api.users.reseller');
  var anotherResellerUser = config.get('api.users.secondReseller');

  before(function (done) {
    done();
  });

  after(function (done) {
    done();
  });

  describe('Accounts resource', function () {

    beforeEach(function (done) {
      done();
    });

    afterEach(function (done) {
      done();
    });

    it('should allow to `get` specific `account` from other `reseller` user.',
      function (done) {
        var newAccount = AccountsDP.generateOne();
        API.helpers
          .authenticateUser(resellerUser)
          .then(function () {
            API.resources.accounts
              .createOneAsPrerequisite(newAccount)
              .then(function (response) {
                API.helpers
                  .authenticateUser(anotherResellerUser)
                  .then(function () {
                    API.resources.accounts
                      .getOne(response.body.id)
                      .expect(200)
                      .end(done);
                  })
                  .catch(done);
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should return `Bad Request` when trying to `update` account from ' +
      'another `reseller` user.',
      function (done) {
        var newAccount = AccountsDP.generateOne();
        var updatedAccount = AccountsDP.generateOne();
        API.helpers
          .authenticateUser(resellerUser)
          .then(function () {
            API.resources.accounts
              .createOneAsPrerequisite(newAccount)
              .then(function (response) {
                API.helpers
                  .authenticateUser(anotherResellerUser)
                  .then(function () {
                    API.resources.accounts
                      .update(response.body.object_id, updatedAccount)
                      .expect(400)
                      .end(done);
                  })
                  .catch(done);
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should return `Bad Request` when trying to `delete` account from ' +
      'another `reseller` user.',
      function (done) {
        var newAccount = AccountsDP.generateOne();
        API.helpers
          .authenticateUser(resellerUser)
          .then(function () {
            API.resources.accounts
              .createOneAsPrerequisite(newAccount)
              .then(function (response) {
                API.helpers
                  .authenticateUser(anotherResellerUser)
                  .then(function () {
                    API.resources.accounts
                      .deleteOne(response.body.object_id)
                      .expect(400)
                      .end(done);
                  })
                  .catch(done);
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should return `Bad Request` when trying to `get` account already ' +
      'deleted.',
      function (done) {
        var newAccount = AccountsDP.generateOne();
        API.helpers
          .authenticateUser(resellerUser)
          .then(function () {
            API.resources.accounts
              .createOneAsPrerequisite(newAccount)
              .then(function (response) {
                var id = response.body.object_id;
                API.resources.accounts
                  .deleteOne(id)
                  .then(function () {
                    API.resources.accounts
                      .getOne(id)
                      .expect(400)
                      .end(function (err, res) {
                        res.body.message.should.equal('Account ID not found');
                        done();
                      });
                  })
                  .catch(done);
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should return `Bad Request` when trying to `update` account already ' +
      'deleted.',
      function (done) {
        var newAccount = AccountsDP.generateOne();
        var updatedAccount = AccountsDP.generateOne();
        API.helpers
          .authenticateUser(resellerUser)
          .then(function () {
            API.resources.accounts
              .createOneAsPrerequisite(newAccount)
              .then(function (response) {
                var id = response.body.object_id;
                API.resources.accounts
                  .deleteOne(id)
                  .then(function () {
                    API.resources.accounts
                      .update(id, updatedAccount)
                      .expect(400)
                      .end(function (err, res) {
                        res.body.message.should.equal('Account ID not found');
                        done();
                      });
                  })
                  .catch(done);
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should return `Bad Request` when trying to `delete` account already ' +
      'deleted.',
      function (done) {
        var newAccount = AccountsDP.generateOne();
        API.helpers
          .authenticateUser(resellerUser)
          .then(function () {
            API.resources.accounts
              .createOneAsPrerequisite(newAccount)
              .then(function (response) {
                var id = response.body.object_id;
                API.resources.accounts
                  .deleteOne(id)
                  .then(function () {
                    API.resources.accounts
                      .deleteOne(id)
                      .expect(400)
                      .end(function (err, res) {
                        res.body.message.should.equal('Account ID not found');
                        done();
                      });
                  })
                  .catch(done);
              })
              .catch(done);
          })
          .catch(done);
      });
  });
});
