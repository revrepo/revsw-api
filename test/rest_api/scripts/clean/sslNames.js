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

var config = require('config');
var API = require('./../../common/api');

describe('Clean up', function () {

  // Since the SSL Names delete operations take a lot of time setting the test timeout value to 60 minutes
  this.timeout(3600000);

  var users = [
    config.get('api.users.admin'),
    config.get('api.users.reseller'),
    config.get('api.users.revAdmin')
  ];
  var namePattern = /[0-9]{13}/;

  describe('SSL Names', function () {

    users.forEach(function (user) {

      describe('With user: ' + user.role, function () {

        it('should clean SSL Names created for testing.',
          function (done) {
            API.identity
              .authenticateWithCredentials(user)
              .then(function () {
                API.resources.sslNames
                  .getAll()
                  .expect(200)
                  .then(function (res) {
                    var ids = [];
                    var sslNames = res.body;
                    sslNames.forEach(function (sslName) {
                      if (namePattern.test(sslName.ssl_name)) {
                        ids.push(sslName.id);
                      }
                    });
                    API.resources.sslNames
                      .deleteManyIfExist(ids)
                      .finally(done);
                  })
                  .catch(done);
              })
              .catch(done);
          });
      });
    });
  });
});
