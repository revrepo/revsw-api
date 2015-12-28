/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2015] Rev Software, Inc.
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
var TwoFADP = require('./../../common/providers/data/2fa');

describe('Smoke check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var user;
  var reseller = config.get('api.users.reseller');

  before(function (done) {
    done();
  });

  after(function (done) {
    done();
  });

  describe('2fa resource', function () {

    beforeEach(function (done) {
      API.helpers
        .authenticateUser(reseller)
        .then(function () {
          return API.helpers.users.createOne({
            firstName: 'Tom',
            lastName: 'Smith'
          });
        })
        .then(function (newUser) {
          user = newUser;
        })
        .then(done)
        .catch(done);
    });

    afterEach(function (done) {
      API.helpers
        .authenticateUser(reseller)
        .then(function () {
          // TODO: this should be changed to the new way to create a resource
          return API.resources.users.user.deleteAllPrerequisites(done);
        })
        .catch(done);
    });

    it('should initialize 2fa for specific user',
      function (done) {
        API.helpers
          .authenticateUser(user)
          .then(function () {
            API.resources.twoFA
              .init()
              .getOne()
              .expect(200)
              .then(function (res) {
                res.body.ascii.should.not.be.undefined();
                res.body.hex.should.not.be.undefined();
                res.body.base32.should.not.be.undefined();
                res.body.google_auth_qr.should.not.be.undefined();
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should enable 2fa for specific user',
      function (done) {
        API.helpers
          .authenticateUser(user)
          .then(function () {
            API.resources.twoFA
              .init()
              .getOne()
              .expect(200)
              .then(function (res) {
                var key = res.body.base32;
                var oneTimePassword = TwoFADP.generateOneTimePassword(key);
                API.resources.twoFA
                  .enable()
                  .createOne(oneTimePassword)
                  .expect(200)
                  .then(function (res) {
                    var expMsg = 'Successfully enabled two factor ' +
                      'authentication';
                    res.body.message.should.equal(expMsg);
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should disable 2fa for specific user',
      function (done) {
        API.helpers
          .authenticateUser(user)
          .then(function () {
            API.resources.twoFA
              .init()
              .getOne()
              .expect(200)
              .then(function (res) {
                var key = res.body.base32;
                var oneTimePassword = TwoFADP.generateOneTimePassword(key);
                API.resources.twoFA
                  .enable()
                  .createOne(oneTimePassword)
                  .expect(200)
                  .then(function () {
                    API.resources.twoFA
                      .disable()
                      .createOne(user.id)
                      .expect(200)
                      .then(function (response) {
                        var expMsg = 'Successfully disabled two factor ' +
                          'authentication';
                        response.body.message.should.equal(expMsg);
                        done();
                      })
                      .catch(done);
                  })
                  .catch(done);
              })
              .catch(done);
          })
          .catch(done);
      });
  });
});
