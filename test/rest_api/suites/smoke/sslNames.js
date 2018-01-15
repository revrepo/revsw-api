/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2016] Rev Software, Inc.
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

var config = require('config');

var API = require('./../../common/api');
var DataProvider = require('./../../common/providers/data');
var SSLNameDP = require('./../../common/providers/data/sslNames');

describe('Smoke check', function () {
  this.timeout(config.get('api.request.maxTimeout'));

  var sslName;
  var accountId;

  // Retrieving information about specific user that later we will use for
  // our API requests.
  var users = [
    config.get('api.users.revAdmin'), 
    config.get('api.users.reseller'),  
    config.get('api.users.admin'),  
    config.get('api.users.user'),
    config.get('api.apikeys.admin'),
    config.get('api.apikeys.reseller')
  ];

  users.forEach(function(user) {

    describe('With user: ' + user.role, function() {

      before(function (done) {
        // if using a user auth then an account is needed
        if (!user.key) {
          API.helpers
          .authenticate(user)
          .then(function () {
            return API.helpers.accounts.createOne();
          })
          .then(function (acc) {            
            accountId = acc.id;
            done();
          })
          .catch(done);
        } else {
          accountId = user.account.id;
          done();
        }
      });

      after(function (done) {
        done();
      });

      describe('SSL Names resource', function () {

        it('should return a success response when getting all SSL Names',
          function (done) {
            API.helpers
              .authenticate(user)
              .then(function () {
                API.resources.sslNames
                  .getAll()
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          });

        it('should return a success response when getting specific SSL Name',
          function (done) {
            API.helpers
              .authenticate(user)
              .then(function () {
                API.resources.sslNames
                  .getAll()
                  .then(function (response){
                    var sslNames = response.body;
                    API.resources.sslNames
                      .getOne(sslNames[0].id)
                      .expect(200)
                      .end(done);
                  })
                  .catch(done);
              })
              .catch(done);
          });

        xit('should return a success response when creating specific SSL name',
          function (done) {
            var sslname = SSLNameDP.generateOne(accountId,'test-' + Date.now());
            API.helpers
              .authenticate(user)
              .then(function () {
                API.resources.sslNames
                  .createOne(sslname)
                  .expect(200)
                  .then(function (response) {
                    API.resources.sslNames
                      .deleteOne(response.body.object_id)
                      .end(done);
                  })
                  .catch(done);
              })
              .catch(done);
          });

        xit('should return a success response when deleting a specific SSL Name',
          function (done) {
            var sslname = SSLNameDP.generateOne(accountId,'test2-' + Date.now());
            API.helpers
              .authenticate(user)
              .then(function () {
                return API.resources.sslNames.createOne(sslname);
              })
              .then(function (response) {
                API.resources.sslNames
                  .deleteOne(response.body.object_id)
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          });

        it('should return a success response when getting specific SSL Name with Email Approvers',
          function (done) {
            API.helpers
              .authenticate(user)
              .then(function () {
                API.resources.sslNames
                  .getAll()
                  .then(function (response){ 
                    var sslNames = response.body; 
                    API.resources.sslNames
                      .approvers()
                      .getAll({ssl_name: sslNames[0].ssl_name})
                      .expect(200)
                      .end(done);
                  })
                  .catch(done);
              })
              .catch(done);
          });

        // TODO: need to rewrite the test
        xit('should return a success response when getting (verify) specific SSL name',
          function (done) {
            API.helpers
              .authenticate(user)
              .then(function () {
                API.resources.sslNames
                  .getAll()
                  .then(function (response){
                    var sslNames = response.body;
                    API.resources.sslNames
                      .verify(sslNames[0].id)
                      .getOne()
                      .expect(200)
                      .end(done);
                  })
                  .catch(done);
              })
              .catch(done);
          });
      });
    });
  });
});
