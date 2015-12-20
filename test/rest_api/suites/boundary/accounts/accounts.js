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
var accounts = require('./../../../common/resources/accounts');
var API = require('./../../../common/api');
var AccountsDP = require('./../../../common/providers/data/accounts');

describe('Boundary check', function () {

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

    beforeEach(function (done) {
      done();
    });

    afterEach(function (done) {
      done();
    });

    it('should return `Bad Request` when trying to `create` account with' +
      '`empty` company name.',
      function (done) {
        var newAccount = AccountsDP.generateOne();
        newAccount.companyName = '';
        API.helpers
          .authenticateUser(resellerUser)
          .then(function () {
            API.resources.accounts
              .createOne(newAccount)
              .expect(400)
              .then(function (response) {
                response.body.message.should.equal('child "companyName" ' +
                  'fails because ["companyName" is not allowed to be empty]');
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should return `Bad Request` when trying to `create` account with' +
      '`long` company name.',
      function (done) {
        // Generating very long string (around 6318 chars)
        var str = 'abcdefghijklmnopqrstuvwxyz';
        var iterations = 5;
        for (var i = 0; i < iterations; i++) {
          str += str + str;
        }
        var newAccount = AccountsDP.generateOne();
        newAccount.companyName = str;
        API.helpers
          .authenticateUser(resellerUser)
          .then(function () {
            API.resources.accounts
              .createOne(newAccount)
              .expect(400)
              .then(function (response) {
                response.body.message.should.equal('child "companyName" ' +
                  'fails because ["companyName" length must be less than or ' +
                  'equal to 150 characters long]');
                done();
              })
              .catch(done);
          })
          .catch(done);
      });
  });
});
