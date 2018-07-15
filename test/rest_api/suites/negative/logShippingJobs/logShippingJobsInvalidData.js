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
      .then(function (newLogShippingJob) {
        logShippingJob = newLogShippingJob;
      })
      .then(done)
      .catch(done);
  });

  after(function (done) {
    API.helpers
      .authenticateUser(revAdmin)
      .then(function () {
        API.resources.logShippingJobs.deleteOne(logShippingJob.id);
        done();
      })
      .catch(done);
  });

  describe('LogShipping Jobs resource', function () {
    describe('With invalid data', function () {

      beforeEach(function (done) {
        done();
      });

      afterEach(function (done) {
        done();
      });

      it('should return `Bad Request` when trying to `create` logshipping job ' +
        'with `invalid` account id.',
        function (done) {
          var invalidAccountId = 'vwxyzvwxyzvwxyzvwxyz1234';
          var expectedMsg = 'child "account_id" fails because ["account_id" ' +
            'with value "' + invalidAccountId + '" fails to match the ' +
            'required pattern: /^[0-9a-fA-F]{24}$/]';
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              var logShippingJob = LogShippingJobsDP.generateOne(invalidAccountId);
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

      it('should return `Bad Request` when trying to get logshipping job ' +
        'with `invalid` log_job_id.',
        function (done) {
          var invalidJobId = 'vwxyzvwxyzvwxyzvwxyz1234';
          var expectedMsg = 'child \"log_job_id\" fails because [\"log_job_id' +
            '\" with value \"' + invalidJobId + '\" fails to match the ' +
            'required pattern: /^[0-9a-fA-F]{24}$/]';
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              API.resources.logShippingJobs
                .getOne(invalidJobId)
                .expect(400)
                .then(function (res) {
                  res.body.message.should.equal(expectedMsg);
                  done();
                })
                .catch(done);
            })
            .catch(done);
        });

      it('should return `Bad Request` when trying to get logshipping job `status` ' +
        'with `invalid` log_job_id.',
        function (done) {
          var invalidJobId = 'vwxyzvwxyzvwxyzvwxyz1234';
          var expectedMsg = 'child \"log_job_id\" fails because [\"log_job_id' +
            '\" with value \"' + invalidJobId + '\" fails to match the ' +
            'required pattern: /^[0-9a-fA-F]{24}$/]';
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              API.resources.logShippingJobs
                .status(invalidJobId)
                .getOne()
                .expect(400)
                .then(function (res) {
                  res.body.message.should.equal(expectedMsg);
                  done();
                })
                .catch(done);
            })
            .catch(done);
        });

      it('should return `Bad Request` when trying to update logshipping job ' +
        'with `invalid` domain.',
        function (done) {
          var firstAcc = account;
          var secAcc;
          var domain1;
          var domain2;
          var newJob;
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              return API.helpers.accounts.createOne();
            })
            .then(function (newAccount) {
              secAcc = newAccount;
              return API.helpers.domainConfigs.createOne(firstAcc.id);
            })
            .then(function (firstDomain) {
              domain1 = firstDomain;
              return API.helpers.domainConfigs.createOne(secAcc.id);
            })
            .then(function (secDomain) {
              domain2 = secDomain;
              newJob = LogShippingJobsDP.generateCompleteOne({
                accountId: firstAcc.id,
                sourceId: domain1.id
              });
              return API
                .resources
                .logShippingJobs
                .update(logShippingJob.id, newJob)
                .expect(200); // this will success because domain and job have the same account_id
            })
            .then(function (job) {
              newJob = LogShippingJobsDP.generateCompleteOne({
                accountId: firstAcc.id,
                sourceId: domain2.id
              });

              return API
                .resources
                .logShippingJobs
                .update(logShippingJob.id, newJob)
                .expect(400); // this will fail because job and domain dont have the same account_id
                              // even tho we have access to that domain!
            })
            .then(function (res) {
              done();
            })
            .catch(done);
        });
    });
  });
});
