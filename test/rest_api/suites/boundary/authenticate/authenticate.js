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

describe('Boundary check', function () {

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

    beforeEach(function (done) {
      done();
    });

    afterEach(function (done) {
      done();
    });

    it('should return `Bad request` error when using non registered long ' +
      'user email',
      function (done) {
        API.resources.authenticate
          .createOne({
            email: 'longEmailthisIsLongEmailthisIsLongEmailthisIsLongEmail' +
            'thisIsLongEmailthisIsLongEmailthisIsLongEmailthisIsLongEmail' +
            'thisIsLongEmailthisIsLongEmailthisIsLongEmailthisIsLongEmail' +
            'thisIsLongEmailthisIsLongEmailthisIsLongEmailthisIsLongEmail' +
            'thisIsLongEmailthisIsLongEmailthisIsLongEmailthisIsLongEmail' +
            'thisIsLongEmailthisIsLongEmailthisIsLongEmailthisIsLongEmail' +
            'thisIsLongEmailthisIsLongEmailthisIsLongEmailthisIsLongEmail' +
            'thisIsLongEmailthisIsLongEmailthisIsLongEmailthisIsLongEmail' +
            'thisIsLongEmailthisIsLongEmailthisIsLongEmailthisIsLongEmail' +
            'thisIsLongEmailthisIsLongEmailthisIsLongEmailthisIsLongEmail' +
            'thisIsLongEmailthisIsLongEmailthisIsLongEmailthisIsLongEmail' +
            'thisIsLongEmailthisIsLongEmailthisIsLongEmailthisIsLongEmail' +
            '@email.com',
            password: 'password'
          })
          .expect(400)
          .then(function (response) {
            response.body.message.should.containEql('must be a valid email');
            done();
          })
          .catch(done);
      });

    it('should return `Unauthorized` error when using non registered long ' +
      'user password',
      function (done) {
        API.resources.authenticate
          .createOne({
            email: user.email,
            password: 'thisIsLongPasswordthisIsLongPasswordthisIsLongPassword' +
            'thisIsLongPasswordthisIsLongPasswordthisIsLongPasswordthisIsLong' +
            'PasswordthisIsLongPasswordthisIsLongPasswordthisIsLongPassword' +
            'thisIsLongPasswordthisIsLongPasswordthisIsLongPasswordthisIsLong' +
            'PasswordthisIsLongPasswordthisIsLongPasswordthisIsLongPassword' +
            'thisIsLongPasswordthisIsLongPasswordthisIsLongPasswordthisIsLong' +
            'PasswordthisIsLongPasswordthisIsLongPasswordthisIsLongPassword' +
            'thisIsLongPasswordthisIsLongPasswordthisIsLongPasswordthisIsLong' +
            'PasswordthisIsLongPasswordthisIsLongPasswordthisIsLongPassword' +
            'thisIsLongPasswordthisIsLongPasswordthisIsLongPasswordthisIsLong' +
            'PasswordthisIsLongPasswordthisIsLongPasswordthisIsLongPassword' +
            'thisIsLongPasswordthisIsLongPasswordthisIsLongPasswordthisIsLong' +
            'PasswordthisIsLongPasswordthisIsLongPassword'
          })
          .expect(401)
          .end(done);
      });
  });
});
