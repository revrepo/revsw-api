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
var API = require('./../../common/api');
var DomainConfigsDP = require('./../../common/providers/data/domainConfigs');
var SchemaProvider = require('./../../common/providers/schema');

describe('Sanity check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var commonAccount;
  var commonDomainConfig;
  var reseller = config.get('api.users.reseller');
  var errorResponseSchema = SchemaProvider.getErrorResponse();

  before(function (done) {
    API
      .authenticateUser(reseller)
      .then(function () {
        return API.helpers.accounts.createOne();
      })
      .then(function (account) {
        commonAccount = account;
        return API.helpers.domainConfigs.createOne(account.id);
      })
      .then(function (domainConfig) {
        commonDomainConfig = domainConfig;
      })
      .then(done)
      .catch(done);
  });

  after(function (done) {
    API
      .authenticateUser(reseller)
      .then(function () {
        return API.resources.domainConfigs.deleteOne(commonDomainConfig.id);
      })
      .then(function () {
        return API.resources.accounts.deleteAllPrerequisites(done);
      })
      .catch(done);
  });

  describe('Domain Configs resource', function () {
    describe('Error Response Data Schema', function () {

      beforeEach(function (done) {
        done();
      });

      afterEach(function (done) {
        done();
      });

      it('should return data applying `error response` schema when getting ' +
        'all domain configs.',
        function (done) {
          API.session.reset();
          API.resources.domainConfigs
            .getAll()
            .expect(401)
            .then(function (response) {
              var data = response.body;
              Joi.validate(data, errorResponseSchema, done);
            })
            .catch(done);
        });

      it('should return data applying `error response` schema when getting ' +
        'specific domain configs.',
        function (done) {
          API.session.reset();
          API.resources.domainConfigs
            .getOne(commonDomainConfig.id)
            .expect(401)
            .then(function (response) {
              var data = response.body;
              Joi.validate(data, errorResponseSchema, done);
            })
            .catch(done);
        });

      it('should return data applying `error response` schema when creating ' +
        'new domain config.',
        function (done) {
          var newDomainConfig = DomainConfigsDP.generateOne(commonAccount.id);
          API.session.reset();
          API.resources.domainConfigs
            .createOne(newDomainConfig)
            .expect(401)
            .then(function (response) {
              var data = response.body;
              Joi.validate(data, errorResponseSchema, done);
            })
            .catch(done);
        });

      it('should return data applying `error response` schema when updating ' +
        'a domain config.',
        function (done) {
          var updatedDomainConfig = DomainConfigsDP.generateOne(commonAccount.id);
          API.session.reset();
          API.resources.domainConfigs
            .update(commonDomainConfig.id, updatedDomainConfig)
            .expect(401)
            .then(function (response) {
              var data = response.body;
              Joi.validate(data, errorResponseSchema, done);
            })
            .catch(done);
        });

      it('should return data applying `error response` schema when deleting ' +
        'a domain config.',
        function (done) {
          API.session.reset();
          API.resources.domainConfigs
            .deleteOne(commonDomainConfig.id)
            .expect(401)
            .then(function (response) {
              var data = response.body;
              Joi.validate(data, errorResponseSchema, done);
            })
            .catch(done);
        });

      it('should return data applying `error response` when trying to get ' +
        '`domain publishing status` for a domain config.',
        function (done) {
          API.session.reset();
          API.resources.domainConfigs
            .status(commonDomainConfig.id)
            .getOne()
            .expect(401)
            .then(function (response) {
              var data = response.body;
              Joi.validate(data, errorResponseSchema, done);
            })
            .catch(done);
        });

      it('should return data applying `error response` when trying to get ' +
        '`domain configuration versions` for a domain config.',
        function (done) {
          API.session.reset();
          API.resources.domainConfigs
            .versions(commonDomainConfig.id)
            .getAll()
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
