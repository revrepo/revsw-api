
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
var DataProvider = require('./../../../common/providers/data');

describe('Functional check', function () {
  describe('Account Transactions', function () {

    // Changing default mocha's timeout (Default is 2 seconds).
    this.timeout(config.get('api.request.maxTimeout'));

    var revAdmin = config.get('api.users.revAdmin');
    var account = AccountsDP.generateOne();
    var accId;

    before(function (done) {
      API.helpers
        .authenticateUser(revAdmin)
        .then(function () {
          API.resources.accounts
            .createOne(account)
            .then(function (response) {
              accId = response.body.object_id;
              done();
            })
            .catch(done);
        })
        .catch(done);
    });

    it('should return 400 status code when getting account transactions ' +
      ' without a registered subscription for the account',
      function (done) {
        API.helpers.authenticateUser(revAdmin)
          .then(function () {
            API
              .resources
              .accounts
              .transactions(accId)
              .getAll()
              .expect(400)
              .end(done);
          });
      });
  });
});
