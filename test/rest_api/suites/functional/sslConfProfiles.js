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
var DataProvider = require('./../../common/providers/data');

describe('Functional check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.api.request.maxTimeout);

  var user = config.get('api.users.revAdmin');

  describe('SSL Config profile resource', function () {
    
    it('should load  SSL Config profiles list with revAdmin role.',
      function (done) {
        API.helpers
          .authenticateUser(user)
          .then(function () {
            API.resources.sslConfProfiles
              .getAll()
              .expect(200)
              .then(function (res) {
                var sslConfProfilesArray = res.body;
                sslConfProfilesArray.length.should.equal(2);
                sslConfProfilesArray[1].id.should.be.equal('571e9f7591dcb9f97a0c4841');
                done();
              })
              .catch(done);
          })
          .catch(done);
      });
  });
});
