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

describe('Negative check', function () {

  this.timeout(config.api.request.maxTimeout);

  var user = config.get('api.users.user');

  describe('Usage Report resource', function () {

    describe('With not-allowed user: ' + user.role, function () {

      it('should return `Forbidden` response when getting specific account usage report with user-role user.',
        function (done) {
          API.identity
            .authenticate(user)
            .then(function () {
              API.resources.usage_report
                .getAll()
                .expect(403)
                .end(done);
            })
            .catch(done);
        });

      it('should return `Forbidden` response when getting specific account usage histogram with user-role user.',
        function (done) {
          API.identity
            .authenticate(user)
            .then(function () {
              API.resources.usage_report
                .stats()
                .getAll()
                .expect(403)
                .end(done);
            })
            .catch(done);
        });
    });
  });
});
