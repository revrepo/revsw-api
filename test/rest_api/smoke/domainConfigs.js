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

var testDomainID = '';
var prerequisiteAccountID = '';
var initialDomain = {};

describe('Domain configs smoke check', function () {

  this.timeout(300000);
  var resellerUser = config.api.users.reseller;

  API.session.setCurrentUser(resellerUser);

  describe('Domain configs resource', function () {
    this.timeout(300000);


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
              testDomainID = response.body.object_id;
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

    it('should return 200 status code when getting a list of domains',
      function (done) {
      this.timeout(300000);
      API.resources.domainConfigs.config
        .getAll()
        .expect(200)
        .end(done);
    });

    it('should return a response when creating a new domain',
      function (done) {
      this.timeout(300000);
      API.resources.domainConfigs.config
        .createOne(DataProvider
          .generateInitialDomainConfig(prerequisiteAccountID))
        .expect(200)
        .then(function (response) {
          API.resources.domainConfigs.config
            .deleteOne(response.body.object_id)
            .expect(200)
            .end(done);

        });
    });

    it('should return a response when getting a specific domain',
      function (done) {
      this.timeout(300000);
      API.resources.domainConfigs.config
        .getOne(testDomainID)
        .expect(200)
        .end(done);
    });

    it('should return a response when updating a domain', function (done) {
      this.timeout(300000);
      API.resources.domainConfigs.config
        .update(
          testDomainID,
          DataProvider
          .generateFullDomainConfig(prerequisiteAccountID, '-UPDATED')
        )
        .expect(200)
        .end(done);
    });

    it('should return a response when deleting a domain', function (done) {
      this.timeout(300000);
      API.resources.domainConfigs.config
        .createOne(DataProvider
          .generateInitialDomainConfig(prerequisiteAccountID))
        .then(function (res) {
          API.resources.domainConfigs.config
            .deleteOne(res.body.object_id)
            .expect(200)
            .end(done);
        });
    });

    it('should return a response on config status request', function (done) {
      this.timeout(300000);
      API.resources.domainConfigs.status
        .getOne(testDomainID)
        .expect(200)
        .end(done);
    });

    it('should respond to PUT request with verify_only flag', function (done){
      this.timeout(300000);
      API.resources.domainConfigs.verify
        .update(
          testDomainID,
          DataProvider
            .generateFullDomainConfig(prerequisiteAccountID)
        )
        .expect(200)
        .end(done);
    });

    it('should respond to PUT request with publish flag', function (done){
      this.timeout(300000);
      API.resources.domainConfigs.publish
        .update(
          testDomainID,
          DataProvider
            .generateFullDomainConfig(prerequisiteAccountID)
        )
        .expect(200)
        .end(done);
    });

  });
});
