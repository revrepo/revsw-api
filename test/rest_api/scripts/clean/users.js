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
  var namePattern = /portal-ui-test-email|api-qa-user-14|test-user-14/;
  var secondNamePattern = /API_TEST_USER_1|[0-9]{13}/;

  describe('Users resource', function () {

    users.forEach(function (user) {

      describe('With user: ' + user.role, function () {

        it('should clean-up Users created for testing.',
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.users
                  .getAll()
                  .expect(200)
                  .then(function (res) {
                    var ids = [];
                    var users = res.body;
                    users.forEach(function (user) {
                      if (namePattern.test(user.email) ||
                        secondNamePattern.test(user.email)) {
                        ids.push(user.user_id);
                      }
                    });

                    API.resources.users
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
