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
var API = require('./../../../common/api');
var AccountsDP = require('./../../../common/providers/data/accounts');
var LogShippingJobsDP = require('./../../../common/providers/data/logShippingJobs');

describe('Negative check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var account;
  var logShippingJob;
  var reseller = config.get('api.users.reseller');
  var revAdmin = config.get('api.users.revAdmin');

  before(function (done) {
    API.helpers
      .authenticateUser(reseller)
      .then(function () {
        return API.helpers.accounts.createOne();
      })
      .then(function (newAccount) {
        account = newAccount;
        return API.helpers.logShippingJobs.createOne(account.id);
      })
      .then(function (newlogShippingJob) {
        logShippingJob = newlogShippingJob;
      })
      .then(done)
      .catch(done);
  });

  after(function (done) {
    API.helpers
      .authenticateUser(revAdmin)
      .then(function () {
        return API.resources.logShippingJobs.deleteOne(logShippingJob.id);
      })
      .then(function () {
        return API.resources.accounts.deleteAllPrerequisites(done);
      })
      .catch(done);
  });

  describe('LogShipping Jobs resource', function () {
    describe('With bogus data', function () {

      beforeEach(function (done) {
        done();
      });

      afterEach(function (done) {
        done();
      });

      it('should return `Bad Request` when trying to `create` logshipping job ' +
        'with `bogus` account id.',
        function (done) {
          var bogusAccountId = '&&&&&';
          var transformedStr = '&amp;&amp;&amp;&amp;&amp;';
          var expectedMsg = 'child "account_id" fails because ["account_id" ' +
            'with value "' + transformedStr + '" fails to match the required ' +
            'pattern: /^[0-9a-fA-F]{24}$/]';
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              var logShippingJob = LogShippingJobsDP.generateOne(bogusAccountId);
              API.resources.logShippingJobs
                .createOne(logShippingJob)
                .expect(400)
                .then(function (res) {
                  res.body.message.should.equal(expectedMsg);
                  done();
                })
                .catch(done);
            })
            .catch(done);
        });


    });
  });
});