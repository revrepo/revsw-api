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
var accounts= require('./../../../common/resources/accounts');
var API= require('./../../../common/api');

describe('Negative check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  before(function (done) {
    done();
  });

  after(function (done) {
    done();
  });

  describe('Forgot resource', function () {
    describe('With bogus data', function () {

      beforeEach(function (done) {
        done();
      });

      afterEach(function (done) {
        done();
      });

      it('should return `Bad Request` when requesting password change ' +
        'with `bogus` user email.',
        function (done) {
          var bogusEmailAddress = '!@#$%^&*(';
          API.resources.forgot
            .createOne({email: bogusEmailAddress})
            .expect(400)
            .then(function (response) {
              response.body.error.should.equal('Bad Request');
              response.body.message.should
                .containEql('"email" must be a valid email');
              done();
            })
            .catch(done);
        });

      it('should return `Bad Request` when requesting password change ' +
        'with `bogus` payload data.',
        function (done) {
          API.resources.forgot
            .createOne('!@#$%^&*(')
            .expect(400)
            .then(function (response) {
              response.body.error.should.equal('Bad Request');
              response.body.message.should
                .containEql('"email" is required');
              done();
            })
            .catch(done);
        });
    });
  });
});