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
  this.timeout(config.get('api.request.maxTimeout'));

  var users = [
    config.get('api.users.revAdmin'),
    config.get('api.users.reseller'),
    config.get('api.users.admin')
  ];
  var namePattern = /API_TEST_APP_[0-9]{13}/;
  var namePattern2 = /[0-9]{13}/;

  describe('Apps', function () {

    users.forEach(function (user) {

      describe('With user: ' + user.role, function () {

        it('should clean Apps created for testing.',
          function (done) {
            API.identity
              .authenticateWithCredentials(user)
              .then(function () {
                API.resources.apps
                  .getAll()
                  .expect(200)
                  .then(function (res) {
                    var ids = [];
                    var apps = res.body;
                    apps.forEach(function (app) {
                      if (namePattern.test(app.app_name) ||
                        namePattern2.test(app.app_name)) {
                        ids.push(app.id);
                      }
                    });

                    API.resources.apps
                      .deleteManyIfExist(ids)
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
