/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2017] Rev Software, Inc.
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
var HelpersAPI = require('./../../common/helpers/api');

describe('Functional check:', function () {
  describe('WAF Stats', function () {
    // Changing default mocha's timeout (Default is 2 seconds).
    this.timeout(config.get('api.request.maxTimeout'));
    var revAdminCredentials = config.api.users.revAdmin;

    // this is waf-monitor domain ID, using this so we have events data to check
    var domainId = '58f01bf75c0383ac4a1837fc';

    var topObjectsTypes = [
      'uri',
      'ip'
    ];

    it('should contain `hits` in WAF events response',
      function (done) {
        API.helpers
          .authenticateUser(revAdminCredentials)
          .then(function () {
            API.resources.wafStats
              .events()
              .getOne(domainId)
              .expect(200)
              .then(function (res) {
                res.body.data.length.should.be.above(0);
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

      topObjectsTypes.forEach(function (type) {
        it('should contain `hits` in WAF top objects response (of type `' +
          type + '`)',
          function (done) {
            API.helpers
              .authenticateUser(revAdminCredentials)
              .then(function () {
                API.resources.wafStats
                  .topObjects()
                  .getOne(domainId, { report_type: type })
                  .expect(200)
                  .then(function (res) {
                    res.body.data.length.should.be.above(0);
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });
      });
  });
});
