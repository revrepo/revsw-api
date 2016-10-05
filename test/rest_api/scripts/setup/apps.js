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
var Constants = require('./../../common/constants');

describe('Setup', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var users = [
    config.get('api.users.revAdmin'),
    config.get('api.users.reseller'),
    config.get('api.users.admin')
  ];
  var platforms = [
    config.get('api.mobileApps.platforms.ios'),
    config.get('api.mobileApps.platforms.android')
  ];

  var buildPrefix = function (user, platform) {
    var tmp = 'qa-' + user.role + '-' + platform + '-';
    return tmp.toLowerCase().replace(/\W/g, '-');
  };

  describe('Apps', function () {

    users.forEach(function (user) {

      describe('With user: ' + user.role, function () {

        platforms.forEach(function (platform) {

          describe('Platform: ' + platform, function () {

            it('should create required items for pagination.',
              function (done) {

                API.helpers
                  .authenticateUser(user)
                  .then(function () {

                    var appsNeeded = [];
                    var prefix = buildPrefix(user, platform);

                    for (var i = 10; i < 40; i++) {
                      appsNeeded.push({
                        account_id: user.account.id,
                        app_name: prefix + i,
                        app_platform: platform
                      });
                    }

                    API.resources.apps
                      .getAll()
                      .expect(200)
                      .then(function (res) {

                        var existingApps = res.body;
                        var appsToCreate = [];
                        var isAppNeeded;

                        for (var i = 0; i < appsNeeded.length; i++) {

                          isAppNeeded = true;

                          for (var j = 0; j < existingApps.length; j++) {
                            if (appsNeeded[i].app_name ===
                              existingApps[j].app_name) {
                              isAppNeeded = false;
                              break;
                            }
                          }

                          if (isAppNeeded) {
                            appsToCreate.push(appsNeeded[i]);
                          }
                        }

                        API.resources.apps
                          .createManyIfNotExist(appsToCreate)
                          .finally(done);
                      })
                      .catch(done);
                  })
                  .catch(done);
              });
          });
        });
      });
    });
  });
});