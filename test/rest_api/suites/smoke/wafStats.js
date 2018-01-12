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

describe('Smoke check:', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var users = [
    config.get('api.users.reseller'),
    config.get('api.users.revAdmin'),
    config.get('api.apikeys.admin'),
    config.get('api.apikeys.reseller')
  ];

  var topObjectsTypes = [
    'uri',
    'ip'
  ];

  var topTypes = [
    'country',
    'rule_id',
    'zone',
    'action_taken'
  ];

  var accountForUsers, domain;

  users.forEach(function (user) {
    describe('With ' + user.role, function () {

      before(function (done) {
        API.helpers
          .authenticate(user)
          .then(function () {
            if (user.key) {
              return user.account;
            } else {
              return HelpersAPI.accounts.createCompleteOne();
            }
          })
          .then(function (newAccount) {
            accountForUsers = newAccount;
            return API.helpers.domainConfigs.createOne(newAccount.id);
          })
          .then(function (dom) {
            domain = dom;
            done();
          })
          .catch(done);
      });

      it('should return success response when getting WAF stats',
        function (done) {
          API.helpers
            .authenticate(user)
            .then(function () {
              API.resources.wafStats
                .getOne(domain.id)
                .expect(200)
                .end(done);
            })
            .catch(done);
        });

      topObjectsTypes.forEach(function (type) {
        it('should return success response when getting WAF stats top objects (of type `' +
          type + '`)',
          function (done) {
            API.helpers
              .authenticate(user)
              .then(function () {
                API.resources.wafStats
                  .topObjects()
                  .getOne(domain.id, { report_type: type })
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          });
      });

      topTypes.forEach(function (type) {
        it('should return success response when getting top WAF stats (of type `' +
          type + '`)',
          function (done) {
            API.helpers
              .authenticate(user)
              .then(function () {
                API.resources.wafStats
                  .top()
                  .getOne(domain.id, { report_type: type })
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          });
      });

      it('should return success response when getting WAF stats events',
        function (done) {
          API.helpers
            .authenticate(user)
            .then(function () {
              API.resources.wafStats
                .events()
                .getOne(domain.id)
                .expect(200)
                .end(done);
            })
            .catch(done);
        });
    });
  });
});
