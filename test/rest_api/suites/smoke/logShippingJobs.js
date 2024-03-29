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

var config = require('config');
var API = require('./../../common/api');
var LogShippingJobsDP = require('./../../common/providers/data/logShippingJobs');
var reseller = config.get('api.users.reseller');
var revAdmin = config.get('api.users.revAdmin');
var users = [
  reseller,
  config.get('api.apikeys.reseller'),
  config.get('api.apikeys.admin')
];

users.forEach(function (user) {
  describe('Smoke check with ' + user.role, function () {

    // Changing default mocha's timeout (Default is 2 seconds).
    this.timeout(config.get('api.request.maxTimeout'));

    var account;
    var firstDc;
    var firstLsJ;
    var secondLsJ;
    var secondLsJresp;
    var destTypes = [
      's3',
      'ftp',
      'sftp',
      'elasticsearch'
    ];

    before(function (done) {
      API.helpers
        .authenticate(user)
        .then(function () {
          if (user.key) {
            return user.account;
          } else {
            return API.helpers.accounts.createOne();
          }
        })
        .then(function (newAccount) {
          account = newAccount;
          return API.helpers.domainConfigs.createOne(account.id);
        })
        .then(function (domainConfig) {
          firstDc = domainConfig;
        })
        .then(function () {
          return API.helpers.logShippingJobs.createOne(account.id);
        })
        .then(function (logShippingJob) {
          firstLsJ = logShippingJob;
        })
        .then(done)
        .catch(done);
    });

    after(function (done) {
      API.helpers
        .authenticateUser(revAdmin)
        .then(function () {
          return API.resources.domainConfigs.deleteOne(firstDc.id);
        })
        .then(function () {
          API.resources.logShippingJobs.deleteOne(firstLsJ.id);
          done();
        })
        .catch(done);
    });

    describe('LogShipping Jobs resource', function () {

      beforeEach(function (done) {
        done();
      });

      afterEach(function (done) {
        done();
      });

      it('should return success response code when getting a list of logshipping jobs',
        function (done) {
          API.helpers
            .authenticate(user)
            .then(function () {
              API.resources.logShippingJobs
                .getAll()
                .expect(200)
                .end(done);
            })
            .catch(done);
        });

      it('should return success response code when creating a new logshipping job',
        function (done) {
          secondLsJ = LogShippingJobsDP.generateOne(account.id);
          API.helpers
            .authenticate(user)
            .then(function () {
              API.resources.logShippingJobs
                .createOne(secondLsJ)
                .expect(200)
                .then(function (response) {
                  secondLsJ.id = response.body.object_id;
                  done();
                })
                .catch(done);
            })
            .catch(done);
        });

      it('should return success response code when getting a specific logshipping job',
        function (done) {
          API.helpers
            .authenticate(user)
            .then(function () {
              API.resources.logShippingJobs
                .getOne(secondLsJ.id)
                .expect(200)
                .then(function (response) {
                  secondLsJresp = response.body;
                  done();
                })
                .catch(done);
            })
            .catch(done);
        });

      it('should return success response code when updating a logshipping job',
        function (done) {
          secondLsJresp = LogShippingJobsDP.generateCompleteOne({
            sourceId: firstDc.id,
            destinationType: 's3',
            accountId: account.id
          });
          API.helpers
            .authenticate(user)
            .then(function () {
              API.resources.logShippingJobs
                .update(firstLsJ.id, secondLsJresp)
                .expect(200)
                .end(done);
            })
            .catch(done);
        });

      destTypes.forEach(function (dest) {
        it('should return success response code when updating log shipping job with `' +
          dest + '` destination type', function (done) {
            secondLsJresp = LogShippingJobsDP.generateCompleteOne({
              sourceId: firstDc.id,
              destinationType: dest,
              accountId: account.id
            });
            API.helpers
              .authenticate(user)
              .then(function () {
                API.resources.logShippingJobs
                  .update(firstLsJ.id, secondLsJresp)
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          });
      });

      it('should return success response code when getting the status of ' +
        'existing logshipping job',
        function (done) {
          API.helpers
            .authenticate(user)
            .then(function () {
              API.resources.logShippingJobs
                .status(secondLsJ.id)
                .getOne()
                .expect(200)
                .end(done);
            })
            .catch(done);
        });

      it('should return success response code when deleting a logshipping job',
        function (done) {
          API.helpers
            .authenticate(user)
            .then(function () {
              API.resources.logShippingJobs
                .deleteOne(secondLsJ.id)
                .expect(200)
                .end(done);
            })
            .catch(done);
        });
    });
  });

});