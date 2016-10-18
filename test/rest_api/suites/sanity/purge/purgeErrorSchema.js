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
var CommonResponseSP =
  require('./../../../common/providers/schema/commonResponse');

describe('Sanity check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var account;
  var domainConfig;
  var reseller = config.get('api.users.reseller');
  var errorResponseSchema = CommonResponseSP.getError();

  before(function (done) {
    API.helpers
      .authenticateUser(reseller)
      .then(function () {
        return API.helpers.accounts.createOne();
      })
      .then(function (newAccount) {
        account = newAccount;
        return API.helpers.domainConfigs.createOne(newAccount.id);
      })
      .then(function (newDomainConfig) {
        domainConfig = newDomainConfig;
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
      .catch(done);
  });

  describe('Purge resource', function () {
    describe('Error Response Data Schema', function () {

      beforeEach(function (done) {
        done();
      });

      afterEach(function (done) {
        done();
      });

      it('should return data applying `error response` schema when getting ' +
        'specific purge.',
        function (done) {
          API.session.reset();
          API.resources.purge
            .getOne('123') // Any id
            .expect(401)
            .then(function (response) {
              var data = response.body;
              Joi.validate(data, errorResponseSchema, done);
            })
            .catch(done);
        });

      it('should return data applying `error response` schema when creating ' +
        'new purge.',
        function (done) {
          var purgeData = PurgeDP.generateOne(domainConfig.id);
          API.session.reset();
          API.resources.purge
            .createOne(purgeData)
            .expect(401)
            .then(function (response) {
              var data = response.body;
              Joi.validate(data, errorResponseSchema, done);
            })
            .catch(done);
        });
    });
  });
});
