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
var DomainConfigsDP = require('./../../../common/providers/data/domainConfigs');
var LogShippingJobsDP = require('./../../../common/providers/data/logShippingJobs');

describe('LogShipping Jobs functional test', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var account;
  var secondAccount;
  var otherAccount;
  var firstDc;
  var secondDc;
  var firstLsJ;
  var firstLsJresp;
  var user = config.get('api.users.reseller');
  var secondReseller = config.get('api.users.secondReseller');
  var revAdmin = config.get('api.users.revAdmin');

  before(function (done) {
    API.helpers
      .authenticateUser(secondReseller)
      .then(function () {
        return API.helpers.accounts.createOne();
      })
      .then(function (newAccount) {
        otherAccount = newAccount;
        return API.helpers.domainConfigs.createOne(otherAccount.id);
      })
      .then(function (newDomainConfig) {
        firstDc = newDomainConfig;
        API.helpers
          .authenticateUser(user)
          .then(function () {
            return API.helpers.accounts.createOne();
          })
          .then(function (newAccount) {
            account = newAccount;
            return API.helpers.accounts.createOne();
          })
          .then(function (newAccount) {
            secondAccount = newAccount;
          })
          .then(function () {
            return API.helpers.domainConfigs.createOne(secondAccount.id);
          })
          .then(function (newDomainConfig) {
            secondDc = newDomainConfig;
            return API.helpers.logShippingJobs.createOne(account.id);
          })
          .then(function (logShippingJob) {
            firstLsJ = logShippingJob;
          })
          .then(done)
          .catch(done);
      })
      .catch(done);
  });

  after(function (done) {
    API.helpers
      .authenticateUser(revAdmin)
      .then(function () {
        return API.resources.accounts.deleteOne(otherAccount.id);
      })
      .then(function () {
        return API.resources.domainConfigs.deleteOne(firstDc.id);
      })
      .then(function () {
        return API.resources.domainConfigs.deleteOne(secondDc.id);
      })
      .then(function () {
        return API.resources.logShippingJobs.deleteOne(firstLsJ.id);
      })
      .catch(done);
  });

  describe('LogShipping Jobs resource', function () {

    it('should not be able to create logshipping job using account from other customer',
      function (done) {
        var logShippingJob = LogShippingJobsDP.generateOne(otherAccount.id);
        API.helpers
          .authenticateUser(user)
          .then(function () {
            API.resources.logShippingJobs
              .createOne(logShippingJob)
              .expect(400)
              .then(function (response) {
                response.body.message.should.equal('Account ID not found');
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should return success response code when getting a specific logshipping job',
      function (done) {
        API.helpers
          .authenticateUser(user)
          .then(function () {
            API.resources.logShippingJobs
              .getOne(firstLsJ.id)
              .expect(200)
              .then(function (response) {
                firstLsJresp = response.body;
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should not be able to activate unconfigured logshipping job',
      function (done) {
        firstLsJresp.source_type = 'domain';
        firstLsJresp.source_id = secondDc.id;
        firstLsJresp.operational_mode = 'active';

        delete firstLsJresp.id;
        delete firstLsJresp.created_by;
        delete firstLsJresp.created_at;
        delete firstLsJresp.updated_at;

        var expectedMsg = 'child \"destination_host\" fails because [\"destination_host\" is not allowed to be empty]';
        API.helpers
          .authenticateUser(user)
          .then(function () {
            API.resources.logShippingJobs
              .update(firstLsJ.id, firstLsJresp)
              .expect(400)
              .then(function (res) {
                res.body.message.should.equal(expectedMsg);
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should not be able to update logshipping job without access to source_type domain',
      function (done) {
        firstLsJresp.source_type = 'domain';
        firstLsJresp.source_id = firstDc.id;
        firstLsJresp.destination_type = 's3';
        firstLsJresp.destination_host = 'test-s3';
        firstLsJresp.destination_key = 'test-s3-key';
        firstLsJresp.destination_password = 'test-s3-secret';
        firstLsJresp.operational_mode = 'stop';
        firstLsJresp.comment = 'this is test logshipping job for smoke API test';

        var expectedMsg = 'Domain ID not found';
        API.helpers
          .authenticateUser(user)
          .then(function () {
            API.resources.logShippingJobs
              .update(firstLsJ.id, firstLsJresp)
              .expect(400)
              .then(function (res) {
                res.body.message.should.equal(expectedMsg);
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should be able to update logshipping job with access to source_type domain and start the job',
      function (done) {
        firstLsJresp.source_type = 'domain';
        firstLsJresp.source_id = secondDc.id;
        firstLsJresp.destination_type = 's3';
        firstLsJresp.destination_host = 'test-s3';
        firstLsJresp.destination_key = 'test-s3-key';
        firstLsJresp.destination_password = 'test-s3-secret';
        firstLsJresp.operational_mode = 'active';
        firstLsJresp.comment = 'this is test logshipping job for smoke API test';

        var expectedMsg = 'Successfully updated the log shipping job';
        API.helpers
          .authenticateUser(user)
          .then(function () {
            API.resources.logShippingJobs
              .update(firstLsJ.id, firstLsJresp)
              .expect(200)
              .then(function (res) {
                res.body.message.should.equal(expectedMsg);
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should return logshipping job with active operational_mode',
      function (done) {
        var expectedOperationalMode = 'active';
        API.helpers
          .authenticateUser(user)
          .then(function () {
            API.resources.logShippingJobs
              .getOne(firstLsJ.id)
              .expect(200)
              .then(function (response) {
                var logShippingJob = response.body;
                logShippingJob.operational_mode.should.equal(expectedOperationalMode);
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    // TODO: As soon as we run logshipper live in QA uncomment this test
    //it('should return logshipping job with pause operational_mode in 3 minutes',
    //  function (done) {
    //    var expectedTimeoutMinutes = 3;
    //    var expectedOperationalMode = 'pause';
    //    setTimeout(function() {
    //      API.helpers
    //        .authenticateUser(user)
    //        .then(function () {
    //          API.resources.logShippingJobs
    //            .getOne(firstLsJ.id)
    //            .expect(200)
    //            .then(function (response) {
    //              var logShippingJob = response.body;
    //              logShippingJob.operational_mode.should.equal(expectedOperationalMode);
    //              done();
    //            })
    //            .catch(done);
    //        })
    //        .catch(done);
    //    }, expectedTimeoutMinutes * 60 * 1000);
    //  });
  });
});
