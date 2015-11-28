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
var API = require('./../common/api');
var DataProvider = require('./../common/providers/data');

describe('Sanity check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.api.request.maxTimeout);

  before(function (done) {
    done();
  });

  after(function (done) {
    done();
  });

  describe('SDK Configs resource', function () {
    describe('Fields Type', function () {

      beforeEach(function (done) {
        done();
      });

      afterEach(function (done) {
        done();
      });

      it('should return field of appropriate types when getting specific account.',
        function (done) {
          var sdk_key = DataProvider.generateSDKConfig().sdk_key;
          API.resources.sdkConfigs
            .getOne(sdk_key)
            .expect(200)
            .end(function(err, res) {
              res.body.app_name.should.be.a.String();
              res.body.os.should.be.a.String();
              res.body.configs.should.be.an.Array();
              done();
            });
        });
    });
  });
});
