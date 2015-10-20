var config = require('./../config/default');
var accounts = require('./../common/resources/accounts');
var API = require('./../common/api');

describe('Negative check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.api.request.maxTimeout);

  var resellerUser = config.api.users.reseller;

  before(function (done) {
    done();
  });

  after(function (done) {
    done();
  });

  describe('Accounts resource', function () {
    describe('With invalid data', function () {

      beforeEach(function (done) {
        done();
      });

      afterEach(function (done) {
        done();
      });

      it('should return `Bad Request` response when getting specific account.',
        function (done) {
          var invalidId = 'invalid-account-id';
          API.session.setCurrentUser(resellerUser);
          API.resources.accounts
            .getOne(invalidId)
            .expect(400)
            .end(done);
        });

      it('should return `Bad Request` response when creating specific account',
        function (done) {
          var invalidAccount = {
            invalidKey: 'Invalid information'
          };
          API.session.setCurrentUser(resellerUser);
          API.resources.accounts
            .createOne(invalidAccount)
            .expect(400)
            .end(done);
        });

      it('should return `Bad Request` response when updating specific account',
        function (done) {
          var invalidId = 'invalid-account-id';
          var invalidUpdatedAccount = {
            invalidKey: 'Invalid information'
          };
          API.session.setCurrentUser(resellerUser);
          API.resources.accounts
            .update(invalidId, invalidUpdatedAccount)
            .expect(400)
            .end(done);
        });

      it('should return `Bad Request` response when deleting an account.',
        function (done) {
          var invalidId = 'invalid-account-id';
          API.session.setCurrentUser(resellerUser);
          API.resources.accounts
            .remove(invalidId)
            .expect(400)
            .end(done);
        });
    });
  });
});
