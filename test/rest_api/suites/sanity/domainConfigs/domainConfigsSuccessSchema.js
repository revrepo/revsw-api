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
var API= require('./../../../common/api');
var DomainConfigsDP= require('./../../../common/providers/data/domainConfigs');
var CommonResponseSP =
  require('./../../../common/providers/schema/commonResponse');
var DomainConfigResponseSP =
  require('./../../../common/providers/schema/domainConfigsResponse');

describe('Sanity check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var account;
  var firstDc;
  var firstFdc;
  var secondDc;
  var reseller = config.get('api.users.reseller');
  var successResponseSchema = CommonResponseSP.getSuccess();
  var successCreateResponseSchema = CommonResponseSP.getSuccessCreate();
  var domainConfigSchema = DomainConfigResponseSP.getDomainConfig();
  var domainConfigStatusSchema = DomainConfigResponseSP.getDomainConfigStatus();
  var fullDomainConfigSchema = DomainConfigResponseSP.getFullDomainConfig();

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
      .then(function (domainConfig) {
        firstDc = domainConfig;
      })
      .then(done)
      .catch(done);
  });

  after(function (done) {
    done();
  });

  describe('Domain Configs resource', function () {
    describe('Success Response Data Schema', function () {

      beforeEach(function (done) {
        done();
      });

      afterEach(function (done) {
        done();
      });

      it('should return data applying `success response` schema when getting ' +
        'all domain configs.',
        function (done) {
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              API.resources.domainConfigs
                .getAll()
                .expect(200)
                .then(function (response) {
                  var domainConfigs = response.body;
                  domainConfigs.forEach(function (domainConfig) {
                    Joi.validate(domainConfig, domainConfigSchema,
                      function (err) {
                        if (err) { // fail test if err, otherwise 'continue'
                          return done(err);
                        }
                      });
                  });
                  done();
                })
                .catch(done);
            })
            .catch(done);
        });

      it('should return data applying `success response` schema when getting ' +
        'specific domain configs.',
        function (done) {
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              API.resources.domainConfigs
                .getOne(firstDc.id)
                .expect(200)
                .then(function (response) {
                  firstFdc = response.body;
                  Joi.validate(firstDc, fullDomainConfigSchema, done);
                })
                .catch(done);
            })
            .catch(done);
        });

      it('should return data applying `success response` schema when ' +
        'creating new domain config.',
        function (done) {
          secondDc = DomainConfigsDP.generateOne(account.id);
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              API.resources.domainConfigs
                .createOne(secondDc)
                .expect(200)
                .then(function (response) {
                  secondDc.id = response.body.object_id;
                  var responseObj = response.body;
                  Joi.validate(responseObj, successCreateResponseSchema, done);
                })
                .catch(done);
            })
            .catch(done);
        });

      it('should return data applying `success response` schema when ' +
        'updating a domain config.',
        function (done) {
          firstFdc.origin_host_header = 'UPDATED' + firstFdc.origin_host_header;
          firstFdc.origin_server = 'UPDATED' + firstFdc.origin_server;
          delete firstFdc.domain_name;
          delete firstFdc.cname;
          delete firstFdc.published_domain_version;
          delete firstFdc.last_published_domain_version;
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              API.resources.domainConfigs
                .update(firstDc.id, firstFdc)
                .expect(200)
                .then(function (response) {
                  firstDc.id = response.body.object_id;
                  var responseObject = response.body;
                  Joi.validate(responseObject, successResponseSchema, done);
                })
                .catch(done);
            })
            .catch(done);
        });

      it('should return data applying `success response` schema when ' +
        'getting status of existing domain config',
        function (done) {
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              API.resources.domainConfigs
                .status(secondDc.id)
                .getOne()
                .expect(200)
                .then(function (response) {
                  var status = response.body;
                  Joi.validate(status, domainConfigStatusSchema, done);
                })
                .catch(done);
            })
            .catch(done);
        });

      it('should return data applying `success response` schema when ' +
        'getting status of existing domain config',
        function (done) {
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              API.resources.domainConfigs
                .versions(secondDc.id)
                .getAll()
                .expect(200)
                .then(function (response) {
                  var dcVersions = response.body;
                  dcVersions.forEach(function (dcVersion) {
                    Joi.validate(dcVersion, domainConfigSchema, function (err) {
                      if (err) { // fail test if err, otherwise 'continue'
                        return done(err);
                      }
                    });
                  });
                  done();
                })
                .catch(done);
            })
            .catch(done);
        });

      it('should return data applying `success response` schema when ' +
        'deleting a domain config.',
        function (done) {
          API.helpers
            .authenticateUser(reseller)
            .then(function () {
              API.resources.domainConfigs
                .deleteOne(secondDc.id)
                .expect(200)
                .then(function (response) {
                  secondDc.id = response.body.object_id;
                  var responseObject = response.body;
                  Joi.validate(responseObject, successResponseSchema, done);
                })
                .catch(done);
            })
            .catch(done);
        });
    });
  });
});
