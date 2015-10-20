var config = require('./../config/default');
var accounts = require('./../common/resources/accounts');
var API = require('./../common/api');
var DataFactory = require('./../common/dataFactory');

describe('Clean up', function () {

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

    it('should clean environment.',
      function (done) {
        var namePattern = /API_TEST_COMPANY_[0-9]{13}/;
        var updatedNamePattern = /UPDATED_API_TEST_COMPANY_[0-9]{13}]/;
        API.session.setCurrentUser(resellerUser);
        API.resources.accounts
          .getAll()
          .expect(200)
          .then(function (res) {
            var ids = [];
            var accounts = res.body;
            var total = accounts.length;
            for (var i = 0; i < total; i++) {
              var account = accounts[i];
              if (namePattern.test(account.companyName) ||
                  updatedNamePattern.test(account.companyName)) {
                ids.push(account.id);
              }
            }
            API.resources.accounts
              .removeMany(ids)
              .finally(done);
          });
      });
  });
});
