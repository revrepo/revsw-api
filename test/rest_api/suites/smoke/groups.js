/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2017] Rev Software, Inc.
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
var should = require('should');
var API = require('./../../common/api');
var GroupDP = require('./../../common/providers/data/groups');
var DataProvider = require('./../../common/providers/data');

describe('Smoke Tests - Groups', function () {
  this.timeout(config.api.request.maxTimeout);

  var users = [
    config.api.users.admin,
    config.api.users.reseller,
    config.api.users.revAdmin,
    config.api.apikeys.admin,
    config.api.apikeys.reseller
  ];

  var groups = [];

  after(function (done) {
    // cleanup groups
    groups.forEach(function (group) {
      API
        .authenticate(config.api.users.revAdmin)
        .then(function () {
          API.resources.groups
            .deleteOne(group)
            .end(done);
        })
        .catch(done);
    });
  });

  users.forEach(function (user) {
    describe('With Role - ' + user.role, function () {

      /**
       * We will test basic CRUD operations for the Group resource
       * 
       *  - creating a group
       *  - getting a list of group's users
       *  - deleting a group
       *  - testing group modification (update)
       */

      // generate testing group data
      var testGroupData = {
        account_id: user.account.id
      };
      var testGroup = GroupDP.generateValid(testGroupData);

      it('Should successfully create a new group with valid data', function (done) {
        API
          .authenticate(user)
          .then(function () {
            API
              .helpers
              .groups
              .create(testGroup)
              .then(function (res) {
                res.id.should.not.equal(null);
                API.resources.groups
                  .deleteOne(res.id)
                  .expect(200)
                  .end(done);
              });
          })
          .catch(done);
      });

      it('Should successfully return a group\'s list of users', function (done) {

        var newUser = DataProvider.generateUser();
        newUser.account_id = user.account.id;
        var testingGroup;

        API
          .authenticate(user)
          .then(function () {
            API
              .helpers
              .groups
              .create(testGroup)
              .then(function (res) {
                // create a group for testing
                should(res.ok);
                res.id.should.not.equal(null);
                testingGroup = res.id;
                groups.push(res.id);
                return API.resources.users.createOne(newUser);
              })
              .then(function (res) {
                // create a user for testing
                should(res.ok);
                newUser.id = res.body.object_id;
                return API.resources.users.getOne(res.body.object_id);
              })
              .then(function (res) {
                // get that user
                should(res.ok);
                var updateUser = res.body;
                updateUser.group_id = testingGroup;
                return API.resources.users.update(newUser.id, updateUser);
              })
              .then(function (res) {
                // update that user with our group_id
                should(res.ok);
                return API.resources.users.getOne(newUser.id);
              })
              .then(function (res) {
                // get him again and test that group_id is saved
                should(res.ok);
                res.body.group_id.should.equal(testingGroup);
                return API.resources.groups.usersList(testingGroup).getAll();
              })
              .then(function (res) {
                // get group's user list and test it
                should(res.ok);
                res.body.count.should.equal(1);
                res.body.users[0].user_id.should.equal(newUser.id);
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

      it('Should successfully delete a group', function (done) {
        API
          .authenticate(user)
          .then(function () {
            API
              .helpers
              .groups
              .create(testGroup)
              .then(function (res) {
                res.id.should.not.equal(null);
                groups.push(res.id);
                done();
              });
          })
          .catch(done);
      });

      describe('Group Modification', function () {

        var modiGroup;

        beforeEach(function (done) {
          // create group for modification testing
          API
            .authenticate(user)
            .then(function () {
              API
                .helpers
                .groups
                .create(testGroup)
                .then(function (res) {
                  res.id.should.not.equal(null);
                  groups.push(res.id);
                  API
                    .resources
                    .groups
                    .getOne(res.id)
                    .expect(200)
                    .then(function (grp) {
                      modiGroup = grp.body;
                      done();
                    })
                    .catch(done);
                });
            })
            .catch(done);
        });

        it('Should successfully update a group with valid data', function (done) {
          var validGroupData = {
            name: 'testing-name-groups-smoke',
            comment: 'testing-comment-groups-smoke'
          };
          validGroupData.account_id = modiGroup.account_id;
          validGroupData.id = modiGroup.id;
          API
            .helpers
            .authenticate(user)
            .then(function () {
              API
                .resources
                .groups
                .update(validGroupData.id, validGroupData)
                .expect(200)
                .then(function (updatedGroup) {
                  API
                    .resources
                    .groups
                    .getOne(validGroupData.id)
                    .expect(200)
                    .then(function (grp) {
                      grp.body.name.should.equal(validGroupData.name);
                      grp.body.comment.should.equal(validGroupData.comment);
                      done();
                    })
                    .catch(done);
                })
                .catch(done);
            })
            .catch(done);
        });

        it('Should successfully update every permission field in a group\'s permissions object ',
          function (done) {

            var defaultPermissions = config.permissions_schema;

            for (var permission in modiGroup.permissions) {
              var currValue = modiGroup.permissions[permission];
              if (currValue === true || currValue === false) {
                // flip the value if boolean
                modiGroup.permissions[permission] = !currValue;
              } else {
                // flip the access and allow list values..
                // the list values themselves will be tested in a different it
                modiGroup.permissions[permission].access = !currValue.access;
                modiGroup.permissions[permission].allow_list = !currValue.allow_list;
              }
            }
            API
              .authenticate(user)
              .then(function () {
                API
                  .resources
                  .groups
                  .update(modiGroup.id, modiGroup)
                  .expect(200)
                  .then(function (updatedGroup) {
                    API
                      .resources
                      .groups
                      .getOne(modiGroup.id)
                      .expect(200)
                      .then(function (grp) {
                        var updatedPerms = grp.body.permissions;
                        for (var permission in updatedPerms) {
                          // should equal the opposite..
                          if (updatedPerms[permission] === false || updatedPerms[permission] === true) {
                            updatedPerms[permission].should.equal(!defaultPermissions[permission]);
                          } else {
                            updatedPerms[permission].access.should.equal(!defaultPermissions[permission].access);
                            updatedPerms[permission].allow_list.should.equal(!defaultPermissions[permission].allow_list);
                          }
                        }
                        done();
                      })
                      .catch(done);
                  })
                  .catch(done);
              })
              .catch(done);
          });

        it('Should successfully update every permission list field in a group\'s permissions object',
          function (done) {
            // fake id to insert into lists
            var demoId = '000706a57957012304a49000'

            for (var permission in modiGroup.permissions) {
              var currValue = modiGroup.permissions[permission];
              if (currValue.access === true || currValue.access === false) {
                modiGroup.permissions[permission].list = [demoId];
              }
            }
            API
              .authenticate(user)
              .then(function () {
                API
                  .resources
                  .groups
                  .update(modiGroup.id, modiGroup)
                  .expect(200)
                  .then(function (updatedGroup) {
                    API
                      .resources
                      .groups
                      .getOne(modiGroup.id)
                      .expect(200)
                      .then(function (grp) {
                        var updatedPerms = grp.body.permissions;
                        for (var permission in updatedPerms) {
                          // should equal the opposite..
                          if (updatedPerms[permission].access === false || updatedPerms[permission].access === true) {
                            updatedPerms[permission].list.should.containEql(demoId);
                          }
                        }
                        done();
                      })
                      .catch(done);
                  })
                  .catch(done);
              })
              .catch(done);
          });

      });
    });
  });
});