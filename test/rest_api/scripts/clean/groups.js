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
var _ = require('lodash');

describe('Clean up', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var users = [
    config.get('api.users.revAdmin'),
    config.get('api.users.reseller'),
    config.get('api.users.admin')
  ];
  var namePattern = /test-group-[0-9]{13}|testing-name-groups-smoke/;

  describe('Groups resource', function () {

    users.forEach(function (user) {

      describe('With user: ' + user.role, function () {

        it('should clean-up Groups created for testing.',
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.groups
                  .getAll()
                  .expect(200)
                  .then(function (res) {
                    var ids = [];
                    var groups = res.body;
                    groups.forEach(function (group) {
                      if (namePattern.test(group.name)) {
                        API.resources.groups.usersList(group.id).getAll().then(function (uList) {
                          var uIDs = _.map(uList.body.users, function (usr) {
                            return usr.user_id;
                          });
                          API.resources.users
                            .deleteManyIfExist(uIDs);
                        });
                        ids.push(group.id);
                      }
                    });

                    API.resources.groups
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
