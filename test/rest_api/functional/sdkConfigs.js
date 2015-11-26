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
//var sdkConfigs = require('./../common/resources/sdkConfigs');
var API = require('./../common/api');
var DataProvider = require('./../common/providers/data');

describe('Functional check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.api.request.maxTimeout);

  var resellerUser = config.api.users.reseller;
  var adminUser = config.api.users.admin;
  var revAdminUser = config.api.users.revAdmin;
  var anotherResellerUser = config.api.users.secondReseller;

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

    it('should allow to `get` specific `SDK config` from `reseller` user.',
      function (done) {
        var sdk_key = DataProvider.generateSDKConfig().sdk_key;
        API.session.setCurrentUser(resellerUser);
        API.resources.sdkConfigs
          .getOne(sdk_key)
          .expect(200)
          .end(done);
      });

    it('should return `Bad Request` when trying to `get` non-existing `SDK config`.',
      function (done) {
        var sdk_key = '1ef4bd35-a131-4219-b330-00debbb3696b';
        API.session.setCurrentUser(resellerUser);
        API.resources.sdkConfigs
          .getOne(sdk_key)
          .expect(400)
          .end(done);
      });

  });
});
