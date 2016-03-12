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
    describe('With empty data', function () {

      beforeEach(function (done) {
        done();
      });

      afterEach(function (done) {
        done();
      });

      it('should return `Bad request` error when authenticating user with ' +
        'empty email',
        function (done) {
          API.resources.authenticate
            .createOne({
              email: '',
              password: 'password'
            })
            .expect(400)
            .then(function (response) {
              var message = response.body.message;
              message.should.containEql('"email" fails');
              message.should.containEql('is not allowed to be empty');
              done();
            })
            .catch(done);
        });

      it('should return `Bad request` error when authenticating user with ' +
        'empty password',
        function (done) {
          API.resources.authenticate
            .createOne({
              email: user.email,
              password: ''
            })
            .expect(400)
            .then(function (response) {
              var message = response.body.message;
              message.should.containEql('"password" fails');
              message.should.containEql('is not allowed to be empty');
              done();
            })
            .catch(done);
        });

      it('should return `Bad request` error when authenticating user with ' +
        'empty data',
        function (done) {
          API.resources.authenticate
            .createOne('')
            .expect(400)
            .then(function (response) {
              var message = response.body.message;
              message.should.containEql('"email" is required');
              done();
            })
            .catch(done);
        });
    });
  });
});
