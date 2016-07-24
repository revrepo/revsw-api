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
var AccountsDP = require('./../../common/providers/data/accounts');
var DataProvider = require('./../../common/providers/data');

describe('Functional check', function () {
  this.timeout(config.api.request.maxTimeout);

  var resellerUser = config.get('api.users.reseller');
  var revAdmin = config.get('api.users.revAdmin');
  var userSample = DataProvider.generateUser('admin');

  before(function (done) {
    API.helpers
      .authenticateUser(resellerUser)
      .then(function () {
        var newAccount = AccountsDP.generateOne();
        return API.resources.accounts
          .createOneAsPrerequisite(newAccount);
      })
      .then(function () {
        userSample.access_control_list.readOnly = false;
        API.resources.users
          .createOneAsPrerequisite(userSample)
          .then(function (response) {
            userSample.id = response.body.object_id;
            userSample.name = userSample.email;

            return API.resources.authenticate.createOne({
              email: userSample.email,
              password: userSample.password
            });
          })
          .then(function (response) {
            userSample.token = response.body.token;
            done();
          })
          .catch(done);
      })
      .catch(done);
  });

  after(function (done) {
    API.helpers
      .authenticateUser(revAdmin)
      .then(function () {
        API.resources.users.deleteAllPrerequisites(done);
      })
      .catch(done);
  });

  describe('Users resource', function () {

    it('should return `Bad Request` when updating user\'s role from `admin` to `user`.',
      function (done) {
        API.helpers
          .authenticateUser(userSample)
          .then(function () {
            API.resources.users
              .update(userSample.id, {
                firstName: 'Yegor',
                lastName: 'Betin',
                role: 'user'
              })
              .expect(400)
              .end(function (err, res) {
                res.body.message.should.equal('Admin cannot change role to user');
                done();
              });
          })
          .catch(done);
      });

    it('should return `Bad Request` when updating user\'s role from `reseller` to `user` having multiple' +
      ' accounts assigned to the reseller',
      function (done) {
        API.helpers
          .authenticateUser(resellerUser)
          .then(function () {
            API.resources.users
              .update(userSample.id, {
                role: 'user'
              })
              .expect(400)
              .end(function (err, res) {
                res.body.message.should.equal('Cannot change role with more, ' +
                  'than 1 account assigned for the user');
                done();
              });
          })
          .catch(done);
      });
  });
});

