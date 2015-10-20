var config = require('./../config/default');
var accounts = require('./../common/resources/accounts');
var API = require('./../common/api');
var DataFactory = require('./../common/dataFactory');

describe('Smoke check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.api.request.maxTimeout);

  var accountSample = DataFactory.generateAccount();
  var resellerUser = config.api.users.reseller;

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

    // Use this block to run some statements before an spec/test starts its
    // execution. This is not the same as before method call.
    beforeEach(function (done) {
      done();
    });

    // Use this block to run some statements after an spec/test ends its
    // execution. This is not the same as after method call.
    afterEach(function (done) {
      done();
    });

    it('should return a response when getting all accounts.',
      function (done) {
        API.session.setCurrentUser(resellerUser);
        API.resources.accounts
          .getAll()
          .expect(200)
          .end(done);
      });

    it('should return a response when getting specific account.',
      function (done) {
        API.session.setCurrentUser(resellerUser);
        API.resources.accounts
          .getOne(accountSample.id)
          .expect(200)
          .end(done);
      });

    it('should return a response when creating specific account.',
      function (done) {
        var newAccount = DataFactory.generateAccount();
        API.session.setCurrentUser(resellerUser);
        API.resources.accounts
          .createOne(newAccount)
          .expect(200)
          .then(function (response) {
            API.resources.accounts
              .remove(response.body.object_id)
              .end(done);
          });
      });

    it('should return a response when updating specific account.',
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
              .end(done);
          });
      });

    it('should return a response when deleting an account.', function (done) {
      var newProject = DataFactory.generateAccount();
      API.session.setCurrentUser(resellerUser);
      API.resources.accounts
        .createOneAsPrerequisite(newProject)
        .then(function (response) {
          var objectId = response.body.object_id;
          API.resources.accounts
            .remove(objectId)
            .expect(200)
            .end(done);
        });
    });
  });
});
