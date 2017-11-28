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
var DomainConfigsDP = require('./../../common/providers/data/domainConfigs');
var PurgeDP = require('./../../common/providers/data/purge');

describe('Smoke check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var account;
  var domainConfig;
  var purge;
  var users = [
    config.get('api.users.revAdmin'),
    config.get('api.users.reseller')
  ];

  users.forEach(function(user) {

    describe('With user: ' + user.role, function() {

      before(function (done) {
        API.helpers
          .authenticateUser(user)
          .then(function () {
            return API.helpers.accounts.createOne();
          })
          .then(function (newAccount) {
            account = newAccount;
            return API.helpers.domainConfigs.createOne(account.id);
          })
          .then(function (newDomainConfig) {
            domainConfig = newDomainConfig;
            return API.helpers.purge.createOne(domainConfig.domain_name);
          })
          .then(function (newPurge) {
            purge = newPurge;
          })
          .then(done)
          .catch(done);
      });

      after(function (done) {
        API.helpers
          .authenticateUser(user)
          .then(function () {
            API.resources.domainConfigs.deleteOne(domainConfig.id);
            done();
          })
          .catch(done);
      });

      describe('Purge resource', function () {

        beforeEach(function (done) {
          done();
        });

        afterEach(function (done) {
          done();
        });

        it('should return data when getting specific purge with user-role user.',
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.purge
                  .getOne(purge.id)
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          });

        it('should return data when creating new purge with user-role user.',
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                var purgeData = PurgeDP.generateOne(domainConfig.domain_name);
                API.resources.purge
                  .createOne(purgeData)
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          });

        it('should return data when getting list purge requests with user-role user.',
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.purge
                  .getAll({domain_id:domainConfig.id})
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          });
      });
    });
  });
});