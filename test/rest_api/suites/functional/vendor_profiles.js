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

describe('Functional check', function () {
  this.timeout(config.api.request.maxTimeout);

  var revAdmin = config.get('api.users.revAdmin');

  after(function (done) {
    done();
  });

  describe('Vendor profile resource', function () {

    it('should load vendor profile names list with admin role', function (done) {
      API.identity
        .authenticate(revAdmin)
        .then(function () {
          API.resources.vendorProfiles
            .getAll({})
            .expect(200)
            .end(function (err, res) {
              done();
            });
        })
        .catch(done);
    });

  });
});

