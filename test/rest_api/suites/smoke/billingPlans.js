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
var API = require('./../../common/api');
var BillingPlansDP = require('./../../common/providers/data/billingPlans');

// TODO Disabling billing plan tests for now. We need to remove the plan creation
// functions and check for four existing plans (Developer/Bronze/Silver/Gold) only

describe('Smoke check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  // Defining set of users for which all below tests will be run
  var users = [
    config.get('api.users.revAdmin')
  ];

  users.forEach(function (user) {

    var testBillingPlan;

    describe('With user: ' + user.role, function () {

      describe('Billing Plans resource', function () {

        before(function (done) {
/*          API.helpers
            .authenticateUser(user)
            .then(function () {
              return API.helpers.billingPlans.createOne();
            })
            .then(function (billingPlan) {
              testBillingPlan = billingPlan;
            })
            .then(done)
            .catch(done);
*/
          done();
        });

        after(function (done) {
          done();
        });

        beforeEach(function (done) {
          done();
        });

        afterEach(function (done) {
          done();
        });

        it('should return a response when getting all billing plans.',
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.billingPlans
                  .getAll()
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          });

        // TODO: please change the check for look for four existing billing plans
        xit('should return a response when getting specific billing plan.',
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.billingPlans
                  .getOne(testBillingPlan.id)
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          });

        // TODO: Not needed to test yet. Also, admin_rw user is required
        xit('should return a response when creating an billing plan.',
          function (done) {
            var newBillingPlan = BillingPlansDP.generateOne();
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.billingPlans
                  .createOne(newBillingPlan)
                  .expect(200)
                  .then(function (response) {
                    // Delete billingPlan
                    API.resources.billingPlans
                      .deleteOne(response.body.object_id)
                      .end(done);
                  })
                  .catch(done);
              })
              .catch(done);
          });

        // TODO: Not needed to test yet. Also, admin_rw user is required
        xit('should return a response when updating an billing plan.',
          function (done) {
            var newBillingPlan = BillingPlansDP.generateOne();
            var updatedBillingPlan = BillingPlansDP
              .generateOneForUpdate(newBillingPlan);
            API.helpers
              .authenticateUser(user)
              .then(function () {
                return API.resources.billingPlans
                  .createOne(newBillingPlan);
              })
              .then(function (response) {
                API.resources.billingPlans
                  .update(response.body.object_id, updatedBillingPlan)
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          });

        // TODO: Not needed to test yet. Also, admin_rw user is required
        xit('should return a response when deleting an billing plan.',
          function (done) {
            var newBillingPlan = BillingPlansDP.generateOne();
            API.helpers
              .authenticateUser(user)
              .then(function () {
                return API.resources.billingPlans
                  .createOne(newBillingPlan);
              })
              .then(function (response) {
                API.resources.billingPlans
                  .deleteOne(response.body.object_id)
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          });
      });
    });
  });
});
