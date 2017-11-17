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
var API = require('./../../common/api');
var AccountsDP = require('./../../common/providers/data/accounts');
var DataProvider = require('./../../common/providers/data');
var account_id = config.get('api.usage_report.account_id');

describe('UsageReport CRUD check:', function () {

  // Changing default mocha's timeout
  this.timeout(config.get('api.request.maxTimeout'));

  var user = config.get('api.users.revAdmin');

  describe( 'UsageReport Stats ', function ( ) {

    it('should return response when getting specific account usage histogram.', 
      function (done) {
        API.helpers
          .authenticateUser(user)
          .then(function () {
            API.resources.usage_report
              .stats()
              .getAll({account_id: account_id})
              .expect(200)
              .then(function (data) {
                report = data.body.metadata;
                report.should.be.not.empty();
                report.account_id.should.be.not.empty();
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should return a success response when getting specific account usage report.', 
      function (done) {
        API.helpers
          .authenticateUser(user)
          .then(function () {
            API.resources.usage_report
              .getAll({account_id: account_id})
              .expect(200)
              .then(function (data) {
                report = data.body.metadata;
                report.should.be.not.empty();
                report.account_id.should.be.not.empty();
                done();
              })
              .catch(done);
          })
          .catch(done);
      });
  });
});
 
