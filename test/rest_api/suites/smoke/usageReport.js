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

describe('Smoke check', function () {
  this.timeout(config.api.request.maxTimeout);

  var users = [
   config.get('api.users.revAdmin'),
   config.get('api.users.secondReseller'),
   config.get('api.users.admin'),
   config.get('api.apikeys.admin'),
   config.get('api.apikeys.reseller')
  ];
  
  users.forEach(function(user) {

    describe('With user: ' + user.role, function() {

      var account_id = user.key ? user.account.id : config.get('api.usage_report.account_id');

      before(function(done) {
        done();
      });

      after(function(done) {
        done();
      }); 

      describe('Usage Report resource', function () {

        it('should return a success response when getting specific account usage report with user-role user.', 
          function (done) {
            API.helpers
              .authenticate(user)
              .then(function () {
                API.resources.usage_report
                  .getAll({account_id: account_id})
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          });

        it('should return a success response when getting specific account usage histogram with user-role user.', 
          function (done) {
            API.helpers
              .authenticate(user)
              .then(function () {
                API.resources.usage_report
                  .stats()
                  .getAll({account_id: account_id})
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          });
      });
    });
  });
});