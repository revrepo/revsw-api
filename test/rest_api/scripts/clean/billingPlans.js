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

describe('Clean up', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.api.request.maxTimeout);

  var reseller = config.get('api.users.reseller');
  var namePattern = /[0-9]{13}/;

  before(function (done) {
    done();
  });

  after(function (done) {
    done();
  });

  describe('Billing Plans resource', function () {

    beforeEach(function (done) {
      done();
    });

    afterEach(function (done) {
      done();
    });

    // TODO: Need to run this script as 'admin_rw' user
    xit('should clean Billing Plans created for testing.',
      function (done) {
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            API.resources.billingPlans
              .getAll()
              .expect(200)
              .then(function (res) {
                var ids = [];
                var billingPlans = res.body;
                billingPlans.forEach(function (billingPlan) {
                  if (namePattern.test(billingPlan.name)) {
                    ids.push(billingPlan.id);
                  }
                });

                API.resources.billingPlans
                  .deleteManyIfExist(ids)
                  .finally(done);
              })
              .catch(done);
          })
          .catch(done);
      });
  });
});
