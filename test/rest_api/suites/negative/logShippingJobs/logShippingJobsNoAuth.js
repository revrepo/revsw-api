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
        return API.resources.logShippingJobs.deleteOne(logShippingJob.id);
      })
      .then(function () {
        return API.resources.accounts.deleteAllPrerequisites(done);
      })
      .catch(done);
  });

  describe('LogShipping Jobs resource', function () {
    describe('Without authentication', function () {

      beforeEach(function (done) {
        done();
      });

      afterEach(function (done) {
        done();
      });

      it('should return `Unauthorized` response when getting all logshipping ' +
        'jobs without authorization.',
        function (done) {
          API.session.reset();
          API.resources.logShippingJobs
            .getAll()
            .expect(401)
            .end(done);
        });

      it('should return `Unauthorized` response when getting one loshipping ' +
        'job without authorization.',
        function (done) {
          API.session.reset();
          API.resources.logShippingJobs
            .getOne(logShippingJob.id)
            .expect(401)
            .end(done);
        });

      it('should return `Unauthorized` response when creating new logshipping ' +
        'job without authorization.',
        function (done) {
          var newLogShippingJob = LogShippingJobsDP.generateOne(account.id);
          API.session.reset();
          API.resources.domainConfigs
            .createOne(newLogShippingJob)
            .expect(401)
            .end(done);
        });

      it('should return `Unauthorized` response when updating a logshipping ' +
        'job without authorization.',
        function (done) {
          var updatedLogShippingJob = LogShippingJobsDP.generateOne(account.id);
          API.session.reset();
          API.resources.logShippingJobs
            .update(logShippingJob.id, updatedLogShippingJob)
            .expect(401)
            .end(done);
        });

      it('should return `Unauthorized` response when deleting a loshipping ' +
        'job without authorization.',
        function (done) {
          API.session.reset();
          API.resources.logShippingJobs
            .deleteOne(logShippingJob.id)
            .expect(401)
            .end(done);
        });
    });
  });
});
