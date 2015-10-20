var config = require('./../config/default');
var accounts = require('./../common/resources/accounts');
var API = require('./../common/api');
var DataFactory = require('./../common/dataFactory');

describe('Negative check', function () {

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
    describe('Without authorization', function () {

      beforeEach(function (done) {
        done();
      });

      afterEach(function (done) {
        done();
      });

      it('should return `Unauthorized` response when getting all accounts.',
        function (done) {
          API.session.reset();
          API.resources.accounts
            .getAll()
            .expect(401)
            .end(done);
        });

      it('should return `Unauthorized` response when getting specific account.',
        function (done) {
          API.session.reset();
          API.resources.accounts
            .getOne(accountSample.id)
            .expect(401)
            .end(done);
        });

      it('should return `Unauthorized` response when creating specific account',
        function (done) {
          var newAccount = DataFactory.generateAccount();
          API.session.reset();
          API.resources.accounts
            .createOne(newAccount)
            .expect(401)
            .end(done);
        });

      it('should return `Unauthorized` response when updating specific account',
        function (done) {
          var updatedAccount = DataFactory.generateAccount('UPDATED');
          API.session.reset();
          API.resources.accounts
            .update(accountSample.id, updatedAccount)
            .expect(401)
            .end(done);
        });

      it('should return `Unauthorized` response when deleting an account.',
        function (done) {
          API.session.reset();
          API.resources.accounts
            .remove(accountSample.id)
            .expect(401)
            .end(done);
        });
    });
  });
});
