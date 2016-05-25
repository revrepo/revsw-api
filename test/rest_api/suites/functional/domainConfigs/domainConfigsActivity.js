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

var should = require('should');

var config = require('config');
var API = require('./../../../common/api');
var DomainConfigsDP = require('./../../../common/providers/data/domainConfigs');
var Utils = require('./../../../common/utils');

describe('Functional check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var account;
  var firstDc;
  var firstFdc;
  var secondDc;
  var reseller = config.get('api.users.reseller');

  before(function (done) {
    API.helpers
      .authenticateUser(reseller)
      .then(function () {
        API.resources.users
          .myself()
          .getOne()
          .then(function (response) {
            reseller.id = response.body.user_id;
          })
          .catch(done);
      })
      .then(function () {
        return API.helpers.accounts.createOne();
      })
      .then(function (newAccount) {
        account = newAccount;
        return API.helpers.domainConfigs.createOne(account.id);
      })
      .then(function (domainConfig) {
        firstDc = domainConfig;
      })
      .then(done)
      .catch(done);
  });

  after(function (done) {
    API.helpers
      .authenticateUser(reseller)
      // TODO: BUG? Cannot delete DomainConfig right after updating it.
      //.then(function () {
      //  return API.resources.domainConfigs.deleteOne(firstDc.id);
      //})
      .then(function () {
        return API.resources.accounts.deleteAllPrerequisites(done);
      })
      .catch(done);
  });

  describe('Domain Configs - Activity resource', function () {

    beforeEach(function (done) {
      done();
    });

    afterEach(function (done) {
      done();
    });

    it('should return activity data after creating a domain config',
      function (done) {
        var startTime = Date.now();
        secondDc = DomainConfigsDP.generateOne(account.id);
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            return API.resources.domainConfigs
              .createOne(secondDc)
              .expect(200)
              .then(function (res) {
                secondDc.id = res.body.object_id;
              })
              .catch(done);
          })
          .then(function () {
            console.log('secondDc.id = ', secondDc.id);
            console.log('reseller.id = ', reseller.id);
            API.resources.activity
              .getAll({
      //          user_id: reseller.id,
                from_timestamp: startTime
              })
              .expect(200)
              .then(function (response) {
                var activities = response.body.data;
                var activity = Utils.searchJsonInArray(activities, {
                  'activity_type': 'add',
                  'activity_target': 'domain',
                  'target_id': secondDc.id
                });
                should.exist(activity);
                activity.activity_type.should.equal('add');
                activity.activity_target.should.equal('domain');
                activity.target_id.should.equal(secondDc.id);
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should return activity data after modifying a domain config',
      function (done) {
        var startTime = Date.now();
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            return API.resources.domainConfigs
              .getOne(firstDc.id)
              .expect(200)
              .then(function (response) {
                firstFdc = response.body;
                firstFdc.origin_host_header = 'UPDATED-' +
                  firstFdc.origin_host_header;
                firstFdc.origin_server = 'UPDATED-' + firstFdc.origin_server;
                delete firstFdc.domain_name;
                delete firstFdc.cname;
              })
              .catch(done);
          })
          .then(function () {
            console.log('firstDc.id = ', firstDc.id);
            return API.resources.domainConfigs
              .update(firstDc.id, firstFdc)
              .expect(200)
              .then(function (res) {
              //  firstDc.id = res.body.object_id;
                console.log('firstDc.id = ', firstDc.id);
              })
              .catch(done);
          })
          .then(function () {
            console.log('firstDc.id = ', firstDc.id);
            API.resources.activity
              .getAll({
       //         user_id: reseller.id,
                from_timestamp: startTime
              })
              .expect(200)
              .then(function (response) {
                var activities = response.body.data;
                var activity = Utils.searchJsonInArray(activities, {
                  'activity_type': 'modify',
                  'activity_target': 'domain',
                  'target_id': firstDc.id
                });
                should.exist(activity);
                activity.activity_type.should.equal('modify');
                activity.activity_target.should.equal('domain');
                activity.target_id.should.equal(firstDc.id);
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should return activity data after deleting a domain config',
      function (done) {
        var startTime = Date.now();
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            return API.resources.domainConfigs
              .deleteOne(secondDc.id)
              .expect(200)
              .then(function (response) {
//                secondDc.id = response.body.object_id;
              })
              .catch(done);
          })
          .then(function () {
            API.resources.activity
              .getAll({
       //         user_id: reseller.id,
                from_timestamp: startTime
              })
              .expect(200)
              .then(function (response) {
                console.log('secondDc.id = ', secondDc.id);
                var activities = response.body.data;
                var activity = Utils.searchJsonInArray(activities, {
                  'activity_type': 'delete',
                  'activity_target': 'domain',
                  'target_id': secondDc.id
                });
                should.exist(activity);
                activity.activity_type.should.equal('delete');
                activity.activity_target.should.equal('domain');
                activity.target_id.should.equal(secondDc.id);
                done();
              })
              .catch(done);
          })
          .catch(done);
      });
  });
});
