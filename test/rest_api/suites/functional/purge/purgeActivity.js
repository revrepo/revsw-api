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

var should = require('should');

var config = require('config');
var API = require('./../../../common/api');
var DomainConfigsDP = require('./../../../common/providers/data/domainConfigs');
var PurgeDP = require('./../../../common/providers/data/purge');
var Utils = require('./../../../common/utils');

describe('Functional check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var account;
  var domainConfig;
  var purge;
  var reseller = config.get('api.users.reseller');

  before(function (done) {
    API.helpers
      .authenticateUser(reseller)
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
      .authenticateUser(reseller)
      .then(function () {
        return API.resources.domainConfigs.deleteOne(domainConfig.id);
      })
      .then(function () {
        return API.resources.accounts.deleteAllPrerequisites(done);
      })
      .catch(done);
  });

  xdescribe('Purge - Activity resource', function () {

    beforeEach(function (done) {
      done();
    });

    afterEach(function (done) {
      done();
    });

    it('should return activity data after creating a purge.',
      function (done) {
        var purgeData;
        var startTime = Date.now();
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            purgeData = PurgeDP.generateOne(domainConfig.domain_name);
            return API.resources.purge
              .createOne(purgeData)
              .expect(200)
              .then(function (res) {
                purgeData.id = res.body.request_id;
              })
              .catch(done);
          })
          .then(function () {
            API.resources.activity
              .getAll({
                user_id: reseller.id,
                from_timestamp: startTime
              })
              .expect(200)
              .then(function (response) {
                var activities = response.body.data;
                var activity = Utils.searchJsonInArray(activities, {
                  'activity_type': 'purge',
                  'activity_target': 'domain',
                  'target_id': purgeData.id // Use domain id?
                });
                should.exist(activity);
                activity.activity_type.should.equal('purge');
                activity.activity_target.should.equal('domain');
                activity.target_id.should.equal(purgeData.id); // Use domain id?
                done();
              })
              .catch(done);
          })
          .catch(done);
      });
  });
});
