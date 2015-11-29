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
var should = require('chai').should;
var async = require('async');



describe('Domain configs functional test', function () {

  var initialDomainID = '';
  var prerequisiteAccountID = '';
  var initialDomain = {};
  var userId = '';
  var testDomain = {};

  this.timeout(300000);
  var resellerUser = config.api.users.reseller;

  API.session.setCurrentUser(resellerUser);

  before(function (done) {
    this.timeout(300000);

    API.resources.accounts
      .createOneAsPrerequisite(DataProvider.generateAccount())
      .then(function (res) {
        prerequisiteAccountID = res.body.object_id;
        initialDomain = DataProvider
          .generateInitialDomainConfig(prerequisiteAccountID);
      })
      .then(function (res) {
          API.resources.domainConfigs.config
            .createOneAsPrerequisite(initialDomain)
            .then(function (response) {
              initialDomainID = response.body.object_id;
            })
            .then(function () {
              API.resources.users.myself
                .getAll()
                .then(function (res) {
                  userId = res.body.user_id;
                });
            })
            .finally(function (){
              done();
            });
      });
  });

  after(function (done) {
    this.timeout(300000);
    API.session.setCurrentUser(resellerUser);
    API.resources.domainConfigs.config.deleteAllPrerequisites(done);
  });

  describe('Update functions', function () {
    this.timeout(300000);
    it('should return Bad Request when updating with invalid config',
      function(done){
      this.timeout(300000);
      API.resources.domainConfigs.config
        .update(
          initialDomainID,
          DataProvider
            .generateInvalidDomainConfig(prerequisiteAccountID)
        )
        .expect(400, done);
    });
    it('should return Bad Request when updating with invalid config' +
      'and verify_only flag',
      function(done){
        this.timeout(300000);
        API.resources.domainConfigs.verify
          .update(
            initialDomainID,
            DataProvider
              .generateInvalidDomainConfig(prerequisiteAccountID)
          )
          .expect(400, done);
      });
    it('should return staging status as InProgress' +
      ' and global status Modified after update', function(done){
      this.timeout(300000);
      API.resources.domainConfigs.config
        .update(
          initialDomainID,
          DataProvider
            .generateFullDomainConfig(prerequisiteAccountID,'-UPDATED')
        )
        .expect(200)
        .then(function (){
          API.resources.domainConfigs.status
            .getOne(initialDomainID)
            .expect(200, {
              staging_status: 'InProgress',
              global_status: 'Modified'
            }, done);
        });
    });
    it('should return global status as Modified and staging status' +
      ' as Published in 120 sec after update', function (done) {
      this.timeout(300000);
      API.resources.domainConfigs.config
        .update(
          initialDomainID,
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
                .getOne(initialDomainID)
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
      this.timeout(300000);
      API.resources.domainConfigs.publish
        .update(
          initialDomainID,
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
                .getOne(initialDomainID)
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

  describe('Activity log check', function () {
    this.timeout(300000);

    it('should get correct activity log after Update action',
      function (done) {
      this.timeout(300000);
      API.resources.domainConfigs.config
        .update(
          initialDomainID,
          DataProvider
            .generateFullDomainConfig(prerequisiteAccountID,'-ACTIVITY')
        )
        .expect(200)
        .then(function () {
          API.resources.activity
            .getAll({domain_id: initialDomainID})
            .expect(function (res){
              res.body.data[0].activity_target.should.equal('domain');
              res.body.data[0].activity_type.should.equal('modify');
              res.body.data[0].user_id.should.equal(userId);
              res.body.data[0].target_name.should
                .equal(initialDomain.domain_name);

            })
            .end(done);

        });
    });
    it('should get correct activity log after Publish action', function (done) {
      this.timeout(300000);
      API.resources.domainConfigs.publish
        .update(
          initialDomainID,
          DataProvider
            .generateFullDomainConfig(prerequisiteAccountID,'-ACTIVITY')
        )
        .expect(200)
        .then(function () {
          API.resources.activity
            .getAll({domain_id: initialDomainID})
            .expect(function (res){
              res.body.data[0].activity_target.should.equal('domain');
              res.body.data[0].activity_type.should.equal('publish');
              res.body.data[0].user_id.should.equal(userId);
              res.body.data[0].target_name.should
                .equal(initialDomain.domain_name);
            })
            .end(done);

        });
    });
    describe('Add and delete actions', function () {
      this.timeout(300000);

      beforeEach(function (done) {
        this.timeout(300000);
        testDomain = DataProvider
          .generateInitialDomainConfig(prerequisiteAccountID);
        done();
      });
      afterEach(function (done) {
        testDomain = {};
        done();
      });
      it('should get correct activity log after Add action', function (done) {
        this.timeout(300000);
        API.resources.domainConfigs.config
          .createOne(testDomain)
          .expect(200)
          .then(function (res) {
            var object_id = res.body.object_id;
            API.resources.activity
              .getAll({domain_id: initialDomainID})
              .expect(function (res){
                res.body.data[0].activity_target.should.equal('domain');
                res.body.data[0].activity_type.should.equal('add');
                res.body.data[0].user_id.should.equal(userId);
                res.body.data[0].target_name.should
                  .equal(testDomain.domain_name);
              })
              .then(function () {
                API.resources.domainConfigs.config
                  .deleteOne(object_id)
                  .expect(200)
                  .end(done);
              });
          });
      });
      it('should get correct activity log after Delete action', function (done) {
        this.timeout(300000);
        API.resources.domainConfigs.config
          .createOne(testDomain)
          .expect(200)
          .then(function (response) {
            API.resources.domainConfigs.config
              .deleteOne(response.body.object_id)
              .expect(200)
              .then(function () {
                API.resources.activity
                  .getAll({domain_id: initialDomainID})
                  .expect(function (res) {
                    res.body.data[0].activity_target.should.equal('domain');
                    res.body.data[0].activity_type.should.equal('delete');
                    res.body.data[0].user_id.should.equal(userId);
                    res.body.data[0].target_name.should
                      .equal(testDomain.domain_name);
                  })
                  .end(done);
              });
          });
      });
    });
  });
});

