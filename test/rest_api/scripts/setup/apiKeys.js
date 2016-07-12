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
var APIKeyDataProvider = require('./../../common/providers/data/apiKeys');
var Constants = require('./../../common/constants');

describe('Setup', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var users = [
    config.get('api.users.revAdmin'),
     config.get('api.users.reseller'),
     config.get('api.users.admin')
  ];
  var accounts = {
    reseller: '55b706a57957012304a49d0b', // API QA Reseller Company
    revadmin: '55b706a57957012304a49d0b', // API QA Reseller Company
    admin: '55b6ff6a7957012304a49d04'     // API QA Account
  };

  var buildPrefix = function (user) {
    var tmp = 'qa-' + user.role + '-';
    return tmp.toLowerCase().replace(/\W/g, '-');
  };

  describe('Api Keys', function () {

    users.forEach(function (user) {

      describe('With user: ' + user.role, function () {

        it('should create required items for pagination.',
          function (done) {

            API.helpers
              .authenticateUser(user)
              .then(function () {

                var apiKeysNeeded = [];
                var apiKeysNeededData = [];
                var prefix = buildPrefix(user);
                var role = user.role.toLowerCase().replace(/\W/g, '');
                var accountId = accounts[role];
                var key;

                for (var i = 10; i < 40; i++) {
                  apiKeysNeeded.push(APIKeyDataProvider.generateOne(accountId));
                  key = APIKeyDataProvider.generateCompleteOne(accountId);
                  key.key_name = prefix + i;
                  apiKeysNeededData.push(key);
                }

                API.resources.apiKeys
                  .getAll()
                  .expect(200)
                  .then(function (res) {

                    var existingApiKeys = res.body;
                    var apiKeysToCreate = [];
                    var apiKeysToCreateData = [];
                    var isApiKeyNeeded;

                    for (var i = 0; i < apiKeysNeeded.length; i++) {

                      isApiKeyNeeded = true;

                      for (var j = 0; j < existingApiKeys.length; j++) {
                        if (apiKeysNeededData[i].key_name ===
                          existingApiKeys[j].key_name) {
                          isApiKeyNeeded = false;
                          break;
                        }
                      }

                      if (isApiKeyNeeded) {
                        apiKeysToCreate.push(apiKeysNeeded[i]);
                        apiKeysToCreateData.push(apiKeysNeededData[i]);
                      }
                    }

                    API.resources.apiKeys
                      .createManyIfNotExist(apiKeysToCreate)
                      .then(function (ids) {

                        var apiKeysToUpdate = [];

                        for (var k = 0; k < ids.length; k++) {
                          apiKeysToUpdate.push({
                            id: ids[k],
                            data: apiKeysToCreateData[k]
                          });
                        }

                        return API.resources.apiKeys
                          .updateManyIfExist(apiKeysToUpdate)
                          .finally(done);
                      });
                  })
                  .catch(done);
              })
              .catch(done);
          });
      });
    });
  });
});
