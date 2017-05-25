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
var Joi = require('joi');

var config = require('config');
var API = require('./../../../common/api');
var DomainConfigsDP = require('./../../../common/providers/data/domainConfigs');
var PurgeDP = require('./../../../common/providers/data/purge');
var CommonRespSP = require('./../../../common/providers/schema/response/commonResponse');
var PurgeRespSP = require('./../../../common/providers/schema/response/purgeResponse');

describe('Sanity check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var account;
  var domainConfig;
  var purge;
  var reseller = config.get('api.users.reseller');
  var successResponseSchema = CommonRespSP.getSuccess();
  var successCreatePurgeResponseSchema = PurgeRespSP.getSuccessCreate();

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
        API.resources.domainConfigs.deleteOne(domainConfig.id);
        done();
      })
      .catch(done);
  });

  describe('Purge resource', function () {
    describe('Success Response Data Schema', function () {

      beforeEach(function (done) {
        done();
      });

      afterEach(function (done) {
        done();
      });

      it('should return data applying `success response` schema when getting ' +
        'specific purge.',
        function (done) {
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              API.resources.purge
                .getOne(purge.id)
                .expect(200)
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, successResponseSchema, done);
                })
                .catch(done);
            })
            .catch(done);
        });

      it('should return data applying `success response` schema when ' +
        'creating new purge.',
        function (done) {
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              var purgeData = PurgeDP.generateOne(domainConfig.domain_name);
              API.resources.purge
                .createOne(purgeData)
                .expect(200)
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, successCreatePurgeResponseSchema, done);
                })
                .catch(done);
            })
            .catch(done);
        });
    });
  });
});
