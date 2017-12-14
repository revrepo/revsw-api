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

describe('Boundary check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var accountId;
  var reseller = config.get('api.users.reseller');
  var revAdmin = config.get('api.users.revAdmin');

  before(function (done) {
    API.identity
      .authenticate(reseller)
      .then(function () {
        API.resources.accounts
          .createOne(AccountsDP.generateOne())
          .then(function (res) {
            accountId = res.body.object_id;
            done();
          });
      })
      .catch(done);
  });

  after(function (done) {
    done();
  });

  describe('LogShipping Jobs resource', function () {

    beforeEach(function (done) {
      done();
    });

    afterEach(function (done) {
      done();
    });

    it('should return `Bad Request` when trying to `create` logshipping job ' +
      'with `long` job_name.',
      function (done) {
        var longJobName = ('LongJobNameLongJobNameLongJobNameLong' +
          'JobNameLongJobNameLongJobNameLongJobNameLongJobName' +
          'LongJobNameLongJobNameLongJobNameLongJobNameLongJob' +
          'NameLongJobNameLongJobNameLongJobNameLongJobName').toLowerCase();
        var expectedMsg = 'child \"job_name\" fails because [\"job_name\" ' +
          'length must be less than or equal to 150 characters long]';
        API.identity
          .authenticate(reseller)
          .then(function () {
            var logShippingJob = LogShippingJobsDP.generateOne(accountId);
            logShippingJob.job_name = longJobName;
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

    it('should return `Bad Request` when trying to `create` logshipping job ' +
      'with `long` account id.',
      function (done) {
        var longAccountId = 'abcdef01234567890123456789';
        var expectedMsg = 'child "account_id" fails because ["account_id" ' +
          'with value "' + longAccountId + '" fails to match the required ' +
          'pattern: /^[0-9a-fA-F]{24}$/]';
        API.identity
          .authenticate(reseller)
          .then(function () {
            var logShippingJob = LogShippingJobsDP.generateOne(longAccountId);
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
