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

require('should-http');

var config = require('config');
var API = require('./../../common/api');

describe('Functional check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  // Defining set of users for which all below tests will be run
  var users = [
    //config.get('api.users.revAdmin'),
    config.get('api.users.reseller')
  ];

  users.forEach(function (user) {

    describe('With user: ' + user.role, function () {

      describe('HealthCheck resource', function () {

        it('should return a response when getting health-check info.',
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                return API.resources.healthCheck
                  .getAll()
                  .expect(200);
              })
              .then(function (response) {
                response.body.message.should.not.be.undefined();
                response.body.version.should.not.be.undefined();
                done();
              })
              .catch(done);
          });
      });
    });
  });

  describe('Without user', function () {

    describe('HealthCheck resource', function () {

      it('should return a response when getting health-check info.',
        function (done) {
          API.resources.healthCheck
            .getAll()
            .expect(200)
            .then(function (response) {
              response.body.message.should.not.be.undefined();
              response.body.version.should.not.be.undefined();
              done();
            })
            .catch(done);
        });
    });
  });

});
