require('should-http');
var Joi = require('joi');

var config = require('./../config/default');
var accounts = require('./../common/resources/accounts');
var API = require('./../common/api');
var DataFactory = require('./../common/dataFactory');
var SchemaFactory = require('./../common/schemaFactory');

describe('Sanity check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.api.request.maxTimeout);

  var accountSample = DataFactory.generateAccount();
  var resellerUser = config.api.users.reseller;
  var normalUser = config.api.users.user;
  var errorResponseSchema = SchemaFactory.getErrorResponse();

  before(function (done) {
    API.session.setCurrentUser(resellerUser);
    API.resources.accounts
      .createOneAsPrerequisite(accountSample)
      .then(function (response) {
        accountSample.id = response.body.object_id;
        done();
      });
  });

  after(function (done) {
    API.session.setCurrentUser(resellerUser);
    API.resources.accounts
      .removeAllPrerequisites()
      .finally(done);
  });

  describe('Accounts resource', function () {
    describe('Success Response Data Schema', function () {

      beforeEach(function (done) {
        done();
      });

      afterEach(function (done) {
        done();
      });

      it('should return data applying `error response` schema when getting ' +
        'all accounts.',
        function (done) {
          API.session.setCurrentUser(normalUser);
          API.resources.accounts
            .getAll()
            .expect(403)
            .then(function (response) {
              var data = response.body;
              Joi.validate(data, errorResponseSchema, done);
            })
            .catch(done);
        });

      it('should return data applying `error response` schema when getting ' +
        'specific account.',
        function (done) {
          API.session.setCurrentUser(normalUser);
          API.resources.accounts
            .getOne(accountSample.id)
            .expect(403)
            .then(function (response) {
              var data = response.body;
              Joi.validate(data, errorResponseSchema, done);
            })
            .catch(done);
        });

      it('should return data applying `error response` schema when ' +
        'creating specific account.',
        function (done) {
          var newAccount = DataFactory.generateAccount();
          API.session.setCurrentUser(normalUser);
          API.resources.accounts
            .createOne(newAccount)
            .expect(403)
            .then(function (response) {
              var data = response.body;
              Joi.validate(data, errorResponseSchema, done);
            })
            .catch(403);
        });

      it('should return data applying `error response` schema when ' +
        'updating specific account.',
        function (done) {
          var updatedAccount = DataFactory.generateAccount('UPDATED');
          API.session.setCurrentUser(normalUser);
          API.resources.accounts
            .update(accountSample.id, updatedAccount)
            .expect(403)
            .then(function (response) {
              var data = response.body;
              Joi.validate(data, errorResponseSchema, done);
            })
            .catch(done);
        });

      it('should return data applying `error response` schema when deleting ' +
        'an account.',
        function (done) {
          API.session.setCurrentUser(normalUser);
          API.resources.accounts
            .remove(accountSample.id)
            .expect(403)
            .then(function (response) {
              var data = response.body;
              Joi.validate(data, errorResponseSchema, done);
            })
            .catch(done);
        });
    });
  });
});
