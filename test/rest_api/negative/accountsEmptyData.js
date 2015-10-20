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
    describe('With empty data', function () {

      beforeEach(function (done) {
        done();
      });

      afterEach(function (done) {
        done();
      });

      it('should return `Bad Request` response when creating specific account',
        function (done) {
          var emptyAccount = {};
          API.session.setCurrentUser(resellerUser);
          API.resources.accounts
            .createOne(emptyAccount)
            .expect(400)
            .end(done);
        });

      it('should return `Not Found` response when updating specific account',
        function (done) {
          var emptyId = '';
          var emptyAccount = {};
          API.session.setCurrentUser(resellerUser);
          API.resources.accounts
            .update(emptyId, emptyAccount)
            .expect(404)
            .end(done);
        });

      it('should return `Not Found` response when deleting an account.',
        function (done) {
          var emptyId = '';
          API.session.setCurrentUser(resellerUser);
          API.resources.accounts
            .remove(emptyId)
            .expect(404)
            .end(done);
        });
    });
  });
});
