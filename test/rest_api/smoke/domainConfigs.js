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

describe('Domain configs smoke check', function () {

  this.timeout(config.api.request.maxTimeout);
  var resellerUser = config.api.users.reseller;

  API.session.setCurrentUser(resellerUser);

  describe('Domain configs resource', function () {



    before(function (done) {

      API.resources.accounts
        .createOneAsPrerequisite(DataProvider.generateAccount())
        .then(function (res){
          prerequisiteAccountID = res.body.object_id;
          API.resources.domainConfigs
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
      API.resources.domainConfigs.deleteAllPrerequisites(done);
      done();
    });

    beforeEach(function (done) {
      done();
    });

    afterEach(function (done) {
      done();
    });

    it('should return 200 status code when getting a list of domains',
     function (done) {
      API.resources.domainConfigs
        .getAll()
        .expect(200)
        .end(done);
    });

    it('should return a response when creating a new domain',
     function (done) {
      API.resources.domainConfigs
        .createOne(DataProvider
          .generateInitialDomainConfig(prerequisiteAccountID))
        .expect(200)
        .then(function (response) {
          API.resources.domainConfigs
            .deleteOne(response.body.object_id)
            .expect(200)
            .then(function (){
              done();
            });

        });
    });

    it('should return a response when getting a specific domain',
     function (done) {
      API.resources.domainConfigs
        .getOne(testDomainID)
        .expect(200)
        .end(done);
    });

    it('should return a response when updating a domain', function (done) {
      API.resources.domainConfigs
        .update(
          testDomainID,
          DataProvider
          .generateFullDomainConfig(prerequisiteAccountID, '-UPDATED')
        )
        .expect(200)
        .end(done);
    });

    it('should return a response when deleting a domain', function (done) {
      API.resources.domainConfigs
        .createOne(DataProvider
          .generateInitialDomainConfig(prerequisiteAccountID))
        .then(function (res) {
          API.resources.domainConfigs
            .deleteOne(res.body.object_id)
            .expect(200)
            .end(done);
        });
    });
  });
});
