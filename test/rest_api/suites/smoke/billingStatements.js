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

// # Smoke check: Accounts Billing Statements
var config = require('config');

var API = require('./../../common/api');

describe('Smoke check', function () {
  this.timeout(config.get('api.request.maxTimeout'));

  var revAdmin = config.get('api.users.revAdmin');
  var accountId;

  before(function (done) {
    API.helpers
      .signUpAndVerifyUser()
      .then(function (user) {
        return API.identity
          .authenticate(revAdmin)
          .then(function () {
            return API.helpers.users.getFirstCompanyId(user);
          })
          .then(function (firstAccountId) {
            accountId = firstAccountId;
            done();
          })
          .catch(done);
      })
      .catch(done);
  });

  after(function (done) {
    done();
  });

  describe('Accounts / Billing Statements resource', function () {

    it('should return success response when creating Billing profile',
      function (done) {
        API.identity
          .authenticate(revAdmin)
          .then(function () {
            API.resources.accounts
              .billingProfile(accountId)
              .createOne()
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

    it('should return success response when getting all Billing statements',
      function (done) {
        API.identity
          .authenticate(revAdmin)
          .then(function () {
            API.resources.accounts
              .statements(accountId)
              .getAll()
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

    it('should return success response when getting specific Billing statement',
      function (done) {
        API.identity
          .authenticate(revAdmin)
          .then(function () {
            return API.helpers.accounts.getFirstStatement(accountId);
          })
          .then(function (statement) {
            API.resources.accounts
              .statements(accountId)
              .getOne(statement.id)
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

    it('should return success response when getting specific Billing ' +
      'statement in PDF format',
      function (done) {
        API.identity
          .authenticate(revAdmin)
          .then(function () {
            return API.helpers.accounts.getFirstStatement(accountId);
          })
          .then(function (statement) {
            API.resources.accounts
              .statements(accountId)
              .pdf(statement.id)
              .getAll()
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

    it('should return success response when getting all Billing transactions',
      function (done) {
        API.identity
          .authenticate(revAdmin)
          .then(function () {
            API.resources.accounts
              .transactions(accountId)
              .getAll()
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

    it('should return success response when getting preview migration ' +
      'information',
      function (done) {
        var billingPlanHandle = 'billing-plan-gold';
        API.identity
          .authenticate(revAdmin)
          .then(function () {
            API.resources.accounts
              .subscriptionPreview(accountId)
              .getOne(billingPlanHandle)
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

    it('should return success response when getting subscription summary',
      function (done) {
        API.identity
          .authenticate(revAdmin)
          .then(function () {
            API.resources.accounts
              .subscriptionSummary(accountId)
              .getAll()
              .expect(200)
              .end(done);
          })
          .catch(done);
      });
  });
});
