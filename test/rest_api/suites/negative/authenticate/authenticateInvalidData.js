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

describe('Negative check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var user = config.get('api.users.reseller');

  before(function (done) {
    done();
  });

  after(function (done) {
    done();
  });

  describe('Authenticate resource', function () {
    describe('With invalid data', function () {

      beforeEach(function (done) {
        done();
      });

      afterEach(function (done) {
        done();
      });

      it('should return `Bad request` error when authenticating user with ' +
        'invalid email',
        function (done) {
          API.resources.authenticate
            .createOne({
              email: 'invalid@email.com',
              password: 'password'
            })
            .expect(401)
            .end(done);
        });

      it('should return `Bad request` error when authenticating user with ' +
        'invalid password',
        function (done) {
          API.resources.authenticate
            .createOne({
              email: user.email,
              password: 'invalid-password'
            })
            .expect(401)
            .end(done);
        });

      it('should return `Bad request` error when authenticating user with ' +
        'invalid data (missing email)',
        function (done) {
          API.resources.authenticate
            .createOne({
              data: 'user'
            })
            .expect(400)
            .then(function (response) {
              var message = response.body.message;
              message.should.containEql('"email" is required');
              done();
            })
            .catch(done);
        });

      it('should return `Bad request` error when authenticating user with ' +
        'invalid data (missing password)',
        function (done) {
          API.resources.authenticate
            .createOne({
              email: 'user@email.com'
            })
            .expect(400)
            .then(function (response) {
              var message = response.body.message;
              message.should.containEql('"password" is required');
              done();
            })
            .catch(done);
        });
    });
  });
});
