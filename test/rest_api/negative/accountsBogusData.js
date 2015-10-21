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

var config = require('./../config/default');
var accounts = require('./../common/resources/accounts');
var API = require('./../common/api');

describe('Negative check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.api.request.maxTimeout);

  var resellerUser = config.api.users.reseller;

  before(function (done) {
    done();
  });

  after(function (done) {
    done();
  });

  describe('Accounts resource', function () {
    describe('With bogus data', function () {

      beforeEach(function (done) {
        done();
      });

      afterEach(function (done) {
        done();
      });

      it('should return `Bad Request` response when getting specific account.',
        function (done) {
          var bogusId = '+_)(*&^%$#@+_)(*&^%$#@';
          API.session.setCurrentUser(resellerUser);
          API.resources.accounts
            .getOne(bogusId)
            .expect(400)
            .end(done);
        });

      it('should return `Bad Request` response when creating specific account',
        function (done) {
          var invalidAccount = {
            companyName: '+_)(*&^%$#@+_)(*&^%$#@'
          };
          API.session.setCurrentUser(resellerUser);
          API.resources.accounts
            .createOne(invalidAccount)
            .expect(400)
            .end(function (error, response) {
              //TODO: Change this callback by `done` callback when following bug
              //is fixed:
              //[BUG] Account could be created with a bogus Company name.
              API.resources.accounts
                .remove(response.body.object_id)
                .end(function () {
                  done(new Error('BUG FOUND: Account could be created with a ' +
                    'bogus company name. ==> ' + error.message));
                });
            });
        });

      it('should return `Bad Request` response when updating specific account',
        function (done) {
          var bogusId = '+_)(*&^%$#@+_)(*&^%$#@';
          var invalidUpdatedAccount = {
            companyName: '+_)(*&^%$#@+_)(*&^%$#@'
          };
          API.session.setCurrentUser(resellerUser);
          API.resources.accounts
            .update(bogusId, invalidUpdatedAccount)
            .expect(400)
            .end(done);
        });

      it('should return `Bad Request` response when deleting an account.',
        function (done) {
          var bogusId = '+_)(*&^%$#@+_)(*&^%$#@';
          API.session.setCurrentUser(resellerUser);
          API.resources.accounts
            .remove(bogusId)
            .expect(400)
            .end(done);
        });
    });
  });
});
