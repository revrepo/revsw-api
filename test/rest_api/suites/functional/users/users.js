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

var API = require('./../../../common/api');
var AccountsDP = require('./../../../common/providers/data/accounts');
var DataProvider = require('./../../../common/providers/data');

describe('Functional check', function () {
  this.timeout(config.api.request.maxTimeout);

  var revAdmin = config.get('api.users.revAdmin');
  var users = [
    config.get('api.users.revAdmin'),
    config.get('api.users.reseller'),
    config.get('api.apikeys.reseller')
  ];

  users.forEach(function (user) {
    describe('Users resource with ' + user.role, function () {

      // roles to test
      var roles = [
        'admin',
        'reseller'
      ];

      var userSample;
      var accountSample = AccountsDP.generateOne();

      before(function (done) {
        API.helpers
          .authenticate(revAdmin)
          .then(function () {
            return API.resources.accounts.createOne(accountSample);
          })
          .then(function (response) {
            accountSample.id = response.body.object_id;
          })
          .then(function () {
            userSample = DataProvider.generateUser('admin');
            userSample.access_control_list.readOnly = false;
            userSample.account_id = accountSample.id;
            return API.resources.users.createOne(userSample);
          })
          .then(function (response) {
            userSample.id = response.body.object_id;
            // another user to be able to change roles
            var userSample2 = DataProvider.generateUser('admin');
            userSample2.access_control_list.readOnly = false;
            userSample2.account_id = accountSample.id;
            return API.resources.users.createOne(userSample2);            
          })
          .then(function () {
            done();
          })
          .catch(done);
      });

      roles.forEach(function (role) {
        it('should successfully update user\'s role to ' + role,
          function (done) {
            API.helpers
              .authenticate(revAdmin)
              .then(function () {
                API.resources.users
                  .update(userSample.id, {
                    firstname: 'Jon',
                    lastname: 'Doe',
                    role: role,
                    account_id: role === 'reseller' ? user.account.id : accountSample.id
                  })
                  .expect(200)
                  .then(function () {
                    API.resources.users
                      .getOne(userSample.id)
                      .expect(200)
                      .then(function (res) {
                        res.body.role.should.equal(role);
                        done();
                      })
                      .catch(done);
                  })
                  .catch(done);
              })
              .catch(done);
          });
      })
    });
  });
});

