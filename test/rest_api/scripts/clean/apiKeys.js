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

var Promise = require('bluebird');
var _ = require('lodash');
var config = require('config');
var API = require('./../../common/api');

describe('Clean up', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var users = [
    config.get('api.users.revAdmin'),
    config.get('api.users.reseller'),
    config.get('api.users.admin')
  ];
  var namePattern = /[0-9]{13}/;

  describe('API Keys', function () {

    users.forEach(function (user) {

      describe('With user: ' + user.role, function () {

        it('should clean API Keys created for testing.',
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                return API.resources.apiKeys
                  .getAll()
                  .expect(200);
              })
              .then(function (res) {
                var apiKeys = res.body;
                var idsForApiKeysToDelete = [];
                return Promise
                  .each(apiKeys, function (apiKey) { // One promise after other
                    return API.resources.accounts
                      .getOne(apiKey.account_id)
                      .then(function (res) {
                        var account = res.body;
                        if (namePattern.test(apiKey.key_name) ||
                          namePattern.test(account.companyName) ||
                          namePattern.test(account.contact_email)) {
                          idsForApiKeysToDelete.push(apiKey.id);
                        }
                      });
                  })
                  .then(function () {
                    API.resources.apiKeys
                      .deleteManyIfExist(idsForApiKeysToDelete)
                      .finally(done);
                  });
              })
              .catch(done);
          });

          it('should clean API Keys created for testing with the name `New API Key` (API QA Account).',
          function (done) {
            var API_QA_ACCOUNT = config.api.users.admin.account.id;
            API.helpers
              .authenticateUser(config.api.users.revAdmin)
              .then(function () {
                return API.resources.apiKeys
                  .getAll({
                    filters: {
                      account_id: API_QA_ACCOUNT
                    }
                  })
                  .expect(200);
              })
              .then(function (res) {
                var keysToDelete = _.filter(res.body, function (key) {
                  return key.key_name === 'New API Key';
                });

                  var keysIds = _.map(keysToDelete, function (key) {
                    return key.id;
                  });
                  API.resources.apiKeys
                    .deleteManyIfExist(keysIds)
                    .finally(done);
              })
              .catch(done);
          });

          it('should clean API Keys created for testing with the name `New API Key` (API QA Reseller Company).',
          function (done) {
            var API_QA_RESELLER_COMPANY = config.api.users.reseller.account.id;
            API.helpers
              .authenticateUser(config.api.users.revAdmin)
              .then(function () {
                return API.resources.apiKeys
                  .getAll({
                    filters: {
                      account_id: API_QA_RESELLER_COMPANY
                    }
                  })
                  .expect(200);
              })
              .then(function (res) {
                var keysToDelete = _.filter(res.body, function (key) {
                  return key.key_name === 'New API Key';
                });

                  var keysIds = _.map(keysToDelete, function (key) {
                    return key.id;
                  });
                  API.resources.apiKeys
                    .deleteManyIfExist(keysIds)
                    .finally(done);
              })
              .catch(done);
          });
      });
    });
  });
});
