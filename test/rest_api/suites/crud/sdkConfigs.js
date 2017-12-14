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

describe('CRUD check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.api.request.maxTimeout);

  var users = [
    config.get('api.users.revAdmin'),
    config.get('api.users.reseller'),
    config.get('api.users.admin'),
    config.get('api.users.user')
  ];

  users.forEach(function(user) {

    describe('With user: ' + user.role, function() {

      before(function (done) {
        done();
      });

      after(function (done) {
        done();
      });

      describe('SDK Configs resource', function () {

        it('should return a success response when getting specific app SDK Config with user-role user.',
          function (done) {
            API.identity
              .authenticate(user)
              .then(function () {
                var sdk_key = DataProvider.generateSDKConfig().sdk_key;
                API.resources.sdkConfigs
                  .getOne(sdk_key)
                  .expect(200)
                  .then(function (res) {
                    var sdk = res.body;
                    sdk.should.not.be.undefined();
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });
      });
    });
  });
});
