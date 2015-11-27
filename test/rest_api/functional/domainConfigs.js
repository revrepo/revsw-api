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

var config = require('config');
var API = require('./../common/api');
var DataProvider = require('./../common/providers/data');

var async = require('async');

var testDomainID = '';
var prerequisiteAccountID = '';

xdescribe('Domain configs functional test', function () {

  this.timeout(config.api.request.maxTimeout);
  var resellerUser = config.api.users.reseller;

  API.session.setCurrentUser(resellerUser);

  before(function (done) {

    API.resources.accounts
      .createOneAsPrerequisite(DataProvider.generateAccount())
      .then(function (res){
        prerequisiteAccountID = res.body.object_id;
        API.resources.domainConfigs.config
          .createOneAsPrerequisite(DataProvider
            .generateInitialDomainConfig(prerequisiteAccountID))
          .then(function (response) {
            testDomainID = response.body.object_id;
          })
          .finally(function (){
            done();
          });
      });
  });

  after(function (done) {
    API.session.setCurrentUser(resellerUser);
    API.resources.domainConfigs.config.deleteAllPrerequisites(done);
    done();
  });

  describe('Update functions', function () {
    this.timeout(150000);
    it('should return Bad Request when updating with invalid config',
      function(done){
      API.resources.domainConfigs.config
        .update(
          testDomainID,
          DataProvider
            .generateInvalidDomainConfig(prerequisiteAccountID)
        )
        .expect(400, done);
    });
    it('should return Bad Request when updating with invalid config' +
      'and verify_only flag',
      function(done){
        API.resources.domainConfigs.verify
          .update(
            testDomainID,
            DataProvider
              .generateInvalidDomainConfig(prerequisiteAccountID)
          )
          .expect(400, done);
      });
    it('should return staging status as InProgress' +
      ' and global status Modified after update', function(done){
      API.resources.domainConfigs.config
        .update(
          testDomainID,
          DataProvider
            .generateFullDomainConfig(prerequisiteAccountID,'-UPDATED')
        )
        .expect(200)
        .then(function (){
          API.resources.domainConfigs.status
            .getOne(testDomainID)
            .expect(200, {
              staging_status: 'InProgress',
              global_status: 'Modified'
            }, done);
        });
    });
    it('should return global status as Modified and staging status' +
      ' as Published in 120 sec after update', function (done) {
      API.resources.domainConfigs.config
        .update(
          testDomainID,
          DataProvider
            .generateFullDomainConfig(prerequisiteAccountID,'-UPDATED')
        )
        .expect(200)
        .then(function (){
          var a = [];
          for (var i = 0; i < 12; i++) {
            a.push(i);
          }
          var publishFlag = false;
          var response_json;
          async.eachSeries(a, function(n, callback) {
            setTimeout( function() {
              API.resources.domainConfigs.status
                .getOne(testDomainID)
                .expect(200)
                .end(function (err, res) {
                  if (err) {
                    throw err;
                  }
                  response_json = res.body;
                  if (res.body.global_status === 'Modified' &&
                      res.body.staging_status === 'Published') {
                    publishFlag = true;
                    callback(true);
                  } else {
                    callback(false);
                  }
                });
            }, 10000);
          }, function(err) {
            if (publishFlag === false) {
              throw 'The configuraton is still not modified.' +
              ' Last status response: ' + JSON.stringify(response_json);
            } else {
              done();
            }
          });
        });
    });

    it('should return global and staging status as Published in 120 sec' +
      ' after update with publish flag', function (done) {
      API.resources.domainConfigs.publish
        .update(
          testDomainID,
          DataProvider
            .generateFullDomainConfig(prerequisiteAccountID,'-UPDATED')
        )
        .expect(200)
        .then(function (){
          var a = [];
          for (var i = 0; i < 12; i++) {
            a.push(i);
          }
          var publishFlag = false;
          var response_json;
          async.eachSeries(a, function(n, callback) {
            setTimeout( function() {
              API.resources.domainConfigs.status
                .getOne(testDomainID)
                .expect(200)
                .end(function (err, res) {
                  if (err) {
                    throw err;
                  }
                  response_json = res.body;
                  if (res.body.global_status === 'Published' &&
                      res.body.staging_status === 'Published') {
                    publishFlag = true;
                    callback(true);
                  } else {
                    callback(false);
                  }
                });
            }, 10000);
          }, function(err) {
            if (publishFlag === false) {
              throw 'The configuraton is still not modified.' +
              ' Last status response: ' + JSON.stringify(response_json);
            } else {
              done();
            }
          });
        });
    });
  });
});
