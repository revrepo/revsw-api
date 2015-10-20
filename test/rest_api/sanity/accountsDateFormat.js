require('should-http');

var config = require('./../config/default');
var accounts = require('./../common/resources/accounts');
var API = require('./../common/api');
var DataFactory = require('./../common/dataFactory');

describe('Sanity check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.api.request.maxTimeout);

  var accountSample = DataFactory.generateAccount();
  var resellerUser = config.api.users.reseller;
  var expectedDateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;

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
    describe('Date Format', function () {

      beforeEach(function (done) {
        done();
      });

      afterEach(function (done) {
        done();
      });

      it('should return `created_at` field in expected `Date format` when ' +
        'getting all accounts.',
        function (done) {
          API.session.setCurrentUser(resellerUser);
          API.resources.accounts
            .getAll()
            .expect(200)
            .then(function (response) {
              var accounts = response.body;
              accounts.forEach(function (account) {
                account.created_at.should.match(expectedDateFormat);
              });
              done();
            });
        });

      it('should return `created_at` field in expected `Date format` when ' +
        'getting specific account.',
        function (done) {
          API.session.setCurrentUser(resellerUser);
          API.resources.accounts
            .getOne(accountSample.id)
            .expect(200)
            .then(function (response) {
              var account = response.body;
              account.created_at.should.match(expectedDateFormat);
              done();
            });
        });

      it('should return `updated_at` field in expected `Date format` when ' +
        'getting all accounts.',
        function (done) {
          API.session.setCurrentUser(resellerUser);
          API.resources.accounts
            .getAll()
            .expect(200)
            .then(function (response) {
              var accounts = response.body;
              accounts.forEach(function (account) {
                account.updated_at.should.match(expectedDateFormat);
              });
              done();
            });
        });

      it('should return `updated_at` field in expected `Date format` when ' +
        'getting specific account.',
        function (done) {
          API.session.setCurrentUser(resellerUser);
          API.resources.accounts
            .getOne(accountSample.id)
            .expect(200)
            .then(function (response) {
              var account = response.body;
              account.updated_at.should.match(expectedDateFormat);
              done();
            });
        });
    });
  });
});
