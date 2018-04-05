/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2017] Rev Software, Inc.
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

var config = require('config');

var API = require('./../../../common/api');
var AccountsDP = require('./../../../common/providers/data/accounts');
var DataProvider = require('./../../../common/providers/data');

describe('Functional check', function() {
  this.timeout(config.api.request.maxTimeout);

  describe('Users managed accounts', function() {
    var resellerUser = config.get('api.users.reseller');
    var revAdmin = config.get('api.users.revAdmin');
    var newUserResseler = DataProvider.generateUser('reseller');
    var accountMain = AccountsDP.generateOne();
    var accountManaged = AccountsDP.generateOne();

    before(function(done) {
      API.helpers
        .authenticateUser(revAdmin)
        .then(function() {
          return API.resources.accounts.createOne(accountMain).then(function(response) {
            accountMain.id = response.body.object_id;
            return accountMain;
          });
        })
        .then(function() {
          return API.resources.accounts.createOne(accountManaged).then(function(response) {
            accountManaged.id = response.body.object_id;
            return accountManaged;
          });
        })
        .then(function() {
          newUserResseler.access_control_list.readOnly = false;
          newUserResseler.companyId = [accountMain.id + '', accountManaged.id + ''];
          return API.resources.users.createOne(newUserResseler)
            .then(function(response) {
              newUserResseler.id = response.body.object_id;
              newUserResseler.name = newUserResseler.email;
              return newUserResseler;
            });
        })
        .then(function() {
          return API.resources.authenticate.createOne({
              email: newUserResseler.email,
              password: newUserResseler.password
            })
            .then(function(response) {
              newUserResseler.token = response.body.token;
              return newUserResseler;
            });
        })
        .then(function() {
          done();
        })
        .catch(done);
    });

    after(function(done) {
      API.helpers
        .authenticateUser(revAdmin)
        .then(function() {
          return API.resources.accounts.deleteOne(accountMain.id);
        })
        .then(function() {
          done();
        })
        .catch(done);
    });

    it('should have access to all managed accounts ', function(done) {
      var userData;
      API.helpers
        .authenticateUser(newUserResseler)
        .then(function() {
          API.resources.users
            .getOne(newUserResseler.id)
            .expect(200)
            .then(function(res) {
              res.body.should.have.property('companyId');
              userData = res.body;
              return userData;
            })
            .then(function() {
              return API.resources.accounts
                .getOne(userData.companyId[0])
                .expect(200);
            })
            .then(function() {
              return API.resources.accounts
                .getOne(userData.companyId[1])
                .expect(200);
            });
        })
        .then(function() {
          done();
        })
        .catch(done);
    });

    describe('after delete managed accounts', function() {
      before(function(done) {
        API.helpers
          .authenticateUser(revAdmin)
          .then(function() {
            return API.resources.accounts
              .deleteOne(newUserResseler.companyId[1])
              .expect(200);
          })
          .then(function() {
            done();
          })
          .catch(done);
      });

      it('should no have access to managed account wich was deleted', function(done) {
        API.helpers
          .authenticateUser(newUserResseler)
          .then(function() {
            return API.resources.accounts
              .getOne(accountManaged.id)
              .expect(400);
          })
          .then(function() {
            done();
          })
          .catch(done);
      });
    });
  });
});
