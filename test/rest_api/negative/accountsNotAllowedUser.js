var config = require('./../config/default');
var accounts = require('./../common/resources/accounts');
var API = require('./../common/api');
var DataFactory = require('./../common/dataFactory');

describe('Negative check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.api.request.maxTimeout);

  var accountSample = DataFactory.generateAccount();
  var revAdminUser = config.api.users.admin.revAdmin;
  var resellerUser = config.api.users.reseller;
  var adminUser = config.api.users.admin;
  var normalUser = config.api.users.user;

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
    describe('With not-allowed users', function () {

      beforeEach(function (done) {
        done();
      });

      afterEach(function (done) {
        done();
      });

      it('should return `Forbidden` response when getting all accounts with ' +
        '`user-role` user.',
        function (done) {
          API.session.setCurrentUser(normalUser);
          API.resources.accounts
            .getAll()
            .expect(403)
            .end(done);
        });

      it('should return `Forbidden` response when getting specific account ' +
        'with `user-role` user.',
        function (done) {
          API.session.setCurrentUser(normalUser);
          API.resources.accounts
            .getOne(accountSample.id)
            .expect(403)
            .end(done);
        });

      it('should return `Forbidden` response when creating specific account ' +
        'with `user-role` user.',
        function (done) {
          var newAccount = DataFactory.generateAccount();
          API.session.setCurrentUser(normalUser);
          API.resources.accounts
            .createOne(newAccount)
            .expect(403)
            .end(done);
        });

      it('should return `Forbidden` response when updating specific account ' +
        'with `user-role` user.',
        function (done) {
          var updatedAccount = DataFactory.generateAccount('UPDATED');
          API.session.setCurrentUser(normalUser);
          API.resources.accounts
            .update(accountSample.id, updatedAccount)
            .expect(403)
            .end(done);
        });

      it('should return `Forbidden` response when deleting an account with ' +
        '`user-role` user.',
        function (done) {
        API.session.setCurrentUser(normalUser);
        API.resources.accounts
          .remove(accountSample.id)
          .expect(403)
          .end(done);

      });

      it('should return `Forbidden` response when getting all accounts with ' +
        '`admin-role` user.',
        function (done) {
          API.session.setCurrentUser(adminUser);
          API.resources.accounts
            .getAll()
            .expect(403)
            .end(done);
        });

      it('should return `Forbidden` response when getting specific account ' +
        'with `admin-role` user.',
        function (done) {
          API.session.setCurrentUser(adminUser);
          API.resources.accounts
            .getOne(accountSample.id)
            .expect(403)
            .end(done);
        });

      it('should return `Forbidden` response when creating specific account ' +
        'with `admin-role` user.',
        function (done) {
          var newAccount = DataFactory.generateAccount();
          API.session.setCurrentUser(adminUser);
          API.resources.accounts
            .createOne(newAccount)
            .expect(403)
            .end(done);
        });

      it('should return `Forbidden` response when updating specific account ' +
        'with `admin-role` user.',
        function (done) {
          var updatedAccount = DataFactory.generateAccount('UPDATED');
          API.session.setCurrentUser(adminUser);
          API.resources.accounts
            .update(accountSample.id, updatedAccount)
            .expect(403)
            .end(done);
        });

      it('should return `Forbidden` response when deleting an account with ' +
        '`admin-role` user.',
        function (done) {
          API.session.setCurrentUser(adminUser);
          API.resources.accounts
            .remove(accountSample.id)
            .expect(403)
            .end(done);

        });

      it('should return `Forbidden` response when getting all accounts with ' +
        '`rev-admin-role` user.',
        function (done) {
          API.session.setCurrentUser(revAdminUser);
          API.resources.accounts
            .getAll()
            .expect(401)
            .end(done);
        });

      it('should return `Forbidden` response when getting specific account ' +
        'with `rev-admin-role` user.',
        function (done) {
          API.session.setCurrentUser(revAdminUser);
          API.resources.accounts
            .getOne(accountSample.id)
            .expect(401)
            .end(done);
        });

      it('should return `Forbidden` response when creating specific account ' +
        'with `rev-admin-role` user.',
        function (done) {
          var newAccount = DataFactory.generateAccount();
          API.session.setCurrentUser(revAdminUser);
          API.resources.accounts
            .createOne(newAccount)
            .expect(401)
            .end(done);
        });

      it('should return `Forbidden` response when updating specific account ' +
        'with `rev-admin-role` user.',
        function (done) {
          var updatedAccount = DataFactory.generateAccount('UPDATED');
          API.session.setCurrentUser(revAdminUser);
          API.resources.accounts
            .update(accountSample.id, updatedAccount)
            .expect(401)
            .end(done);
        });

      it('should return `Forbidden` response when deleting an account with ' +
        '`rev-admin-role` user.',
        function (done) {
          API.session.setCurrentUser(revAdminUser);
          API.resources.accounts
            .remove(accountSample.id)
            .expect(401)
            .end(done);
        });
    });
  });
});
