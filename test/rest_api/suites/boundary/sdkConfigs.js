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
var API= require('./../../common/api');
var DataProvider= require('./../../common/providers/data');

describe('Boundary check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.api.request.maxTimeout);

  before(function (done) {
    done();
  });

  after(function (done) {
    done();
  });

  describe('SDK Configs resource', function () {

    beforeEach(function (done) {
      done();
    });

    afterEach(function (done) {
      done();
    });

    it('should return `Bad Request` when trying to `get` an `SDK config` with a too long `SDK key`.',
      function (done) {
        var sdk_key = DataProvider.generateInvalidSDKConfig().too_long_sdk_key;
        API.resources.sdkConfigs
          .getOne(sdk_key)
          .expect(400)
          .end(function (err, res) {
            res.body.error.should.equal('Bad Request');
            res.body.message.should.equal('child "sdk_key" fails because ' +
                                          '["sdk_key" length must be 36 characters long]');
            done();
          });
      });

    it('should return `Bad Request` when trying to `get` an `SDK config` with a too short `SDK key`.',
      function (done) {
        var sdk_key = DataProvider.generateInvalidSDKConfig().too_short_sdk_key;
        API.resources.sdkConfigs
          .getOne(sdk_key)
          .expect(400)
          .end(function (err, res) {
            res.body.error.should.equal('Bad Request');
            res.body.message.should.equal('child "sdk_key" fails because ' +
                                          '["sdk_key" length must be 36 characters long]');
            done();
          });
      });

  });
});
