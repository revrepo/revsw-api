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
var accounts= require('./../../../common/resources/accounts');
var API= require('./../../../common/api');

describe('Negative check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var resellerUser = config.get('api.users.reseller');

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
          API.helpers
            .authenticateUser(resellerUser)
            .then(function () {
              API.resources.accounts
                .getOne(bogusId)
                .expect(400)
                .end(done);
            })
            .catch(done);
        });

      it('should return `Bad Request` response when creating specific account',
        function (done) {
          var invalidAccount = {
            companyName: '+_)(*&^%$#@+_)(*&^%$#@'
          };
          API.helpers
            .authenticateUser(resellerUser)
            .then(function () {
              API.resources.accounts
                .createOne(invalidAccount)
                .expect(400)
                .then(function (response) {
                  response.body.error.should.equal('Bad Request');
                  done();
                })
                .catch(done);
            })
            .catch(done);
        });

      it('should return `Bad Request` response when updating specific account',
        function (done) {
          var bogusId = '+_)(*&^%$#@+_)(*&^%$#@';
          var invalidUpdatedAccount = {
            companyName: '+_)(*&^%$#@+_)(*&^%$#@'
          };
          API.helpers
            .authenticateUser(resellerUser)
            .then(function () {
              API.resources.accounts
                .update(bogusId, invalidUpdatedAccount)
                .expect(400)
                .end(done);
            })
            .catch(done);
        });

      it('should return `Bad Request` response when deleting an account.',
        function (done) {
          var bogusId = '+_)(*&^%$#@+_)(*&^%$#@';
          API.helpers
            .authenticateUser(resellerUser)
            .then(function () {
              API.resources.accounts
                .deleteOne(bogusId)
                .expect(400)
                .end(done);
            })
            .catch(done);
        });
    });
  });
});
