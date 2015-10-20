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
  var accountSchema = SchemaFactory.getAccount();
  var successResponseSchema = SchemaFactory.getSuccessResponse();
  var successCreateResponseSchema = SchemaFactory.getSuccessCreateResponse();

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

      it('should return data applying accounts schema when getting all ' +
        'accounts.',
        function (done) {
          API.session.setCurrentUser(resellerUser);
          API.resources.accounts
            .getAll()
            .expect(200)
            .then(function (response) {
              var accounts = response.body;
              accounts.forEach(function (account) {
                Joi.validate(account, accountSchema, function (err) {
                  if (err) {
                    return done(err);
                  }
                });
              });
              done();
            })
            .catch(done);
        });

      it('should return data applying accounts schema when getting specific ' +
        'account.',
        function (done) {
          API.session.setCurrentUser(resellerUser);
          API.resources.accounts
            .getOne(accountSample.id)
            .expect(200)
            .then(function (response) {
              var account = response.body;
              Joi.validate(account, accountSchema, done);
            });
        });

      it('should return data applying `success response` schema when ' +
        'creating specific account.',
        function (done) {
          var newAccount = DataFactory.generateAccount();
          API.session.setCurrentUser(resellerUser);
          API.resources.accounts
            .createOne(newAccount)
            .expect(200)
            .then(function (response) {
              var data = response.body;
              Joi.validate(data, successCreateResponseSchema, function (error) {
                if (error) {
                  return done(error);
                }
                // TODO: register prerequisite
                API.resources.accounts
                  .remove(data.object_id)
                  .end(done);
              });
            });
        });

      it('should return data applying `success response` schema when ' +
        'updating specific account.',
        function (done) {
          var newAccount = DataFactory.generateAccount();
          var updatedAccount = DataFactory.generateAccount('UPDATED');
          API.session.setCurrentUser(resellerUser);
          API.resources.accounts
            .createOneAsPrerequisite(newAccount)
            .then(function (response) {
              API.resources.accounts
                .update(response.body.object_id, updatedAccount)
                .expect(200)
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, successResponseSchema, done);
                });
            });
        });

      it('should return data applying `success response` schema when deleting ' +
        'an account.',
        function (done) {
          var newProject = DataFactory.generateAccount();
          API.session.setCurrentUser(resellerUser);
          API.resources.accounts
            .createOneAsPrerequisite(newProject)
            .then(function (response) {
              API.resources.accounts
                .remove(response.body.object_id)
                .expect(200)
                .then(function (response) {
                  var data = response.body;
                  Joi.validate(data, successResponseSchema, done);
                });
            });
        });
    });
  });
});
