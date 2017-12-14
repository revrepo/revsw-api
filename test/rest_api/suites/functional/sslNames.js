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

require('should-http');

var config = require('config');

var API = require('./../../common/api');
var DataProvider = require('./../../common/providers/data');
var SSLNameDP = require('./../../common/providers/data/sslNames');

describe('Functional check', function () {
  this.timeout(config.get('api.request.maxTimeout'));

  // Shared variables
  var sslName;
  var accountId;

  // Retrieving information about specific user that later we will use for
  // our API requests.
  var users = [
    config.get('api.users.revAdmin'),
    config.get('api.users.reseller'),
    config.get('api.users.admin'),
    config.get('api.users.user')
  ];

  users.forEach(function(user) {

    describe('With user: ' + user.role, function() {

      before(function (done) {
        // API.helpers
        //   .authenticateUser(user)
        //   .then(function () {
        //     return API.helpers.sslNames.createOne();
        //   })
        //   .then(function (sslname) {
        //     sslName = sslname;
        //     accountId = sslName.account_id;
        //     done();
        //   })
        //   .catch(done);
        done();
      });

      after(function (done) {
        done();
      });

      describe('SSL Names resource', function () {

        it('should get SSL Names list with user-role user.',
          function (done) {
            API.identity
              .authenticate(user)
              .then(function () {
                API.resources.sslNames
                  .getAll()
                  .expect(200)
                  .then(function (res) {
                    var sslNames = res.body;
                    sslNames.should.not.be.undefined();
                    sslNames.length.should.greaterThanOrEqual(0);
                    sslNames.forEach(function (ssl) {
                      ssl.ssl_name.should.not.be.undefined();
                    });
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });

        it('should get specific SSL Name with user-role user.',
          function (done) {
            API.identity
              .authenticate(user)
              .then(function () {
                API.resources.sslNames
                  .getAll()
                  .then(function (response){
                    var sslNames = response.body;
                    API.resources.sslNames
                      .getOne(sslNames[0].id)
                      .expect(200)
                      .then(function (res) {
                        var ssl = res.body;
                        ssl.should.not.be.undefined();
                        ssl.ssl_name.should.not.be.undefined();
                        done();
                      })
                      .catch(done);
                  })
                  .catch(done);
              })
              .catch(done);
          });

        xit('should create specific SSL Name user-role user.',
          function (done) {
            var sslname = SSLNameDP.generateOne(accountId,'test');
            API.identity
              .authenticate(user)
              .then(function () {
                API.resources.sslNames
                  .createOne(sslname)
                  .expect(200)
                  .then(function (response) {
                    response.body.message.should.equal('Successfully added new SSL name');
                    API.resources.sslNames
                       .deleteOne(response.body.object_id)
                       .end(done);
                  })
                  .catch(done);
              })
              .catch(done);
          });

        xit('should delete specific SSL Name with user-role user.',
          function (done) {
            var sslname = SSLNameDP.generateOne(accountId,'test2');
            API.identity
              .authenticate(user)
              .then(function () {
                return API.resources.sslNames.createOne(sslname);
              })
              .then(function (response) {
                API.resources.sslNames
                  .deleteOne(response.body.object_id)
                  .expect(200)
                  .then(function(res) {
                    res.body.message.should.equal('Successfully deleted the SSL name');
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });

       it('should get specific SSL Name with Email Approvers and user-role user.',
          function (done) {
            API.identity
              .authenticate(user)
              .then(function () {
                API.resources.sslNames
                  .getAll()
                  .then(function (response) {
                    var sslNames = response.body;
                    API.resources.sslNames
                      .approvers()
                      .getAll({ssl_name:sslNames[0].ssl_name})
                      .expect(200)
                      .then(function (res) {
                        var approvers = res.body;
                        approvers.should.not.be.undefined();
                        approvers.length.should.greaterThanOrEqual(0);
                        approvers.forEach(function (email) {
                          email.approver_email.should.not.be.undefined();
                        });
                        done();
                      })
                      .catch(done);
                  })
                  .catch(done);
              })
              .catch(done);
          });

        xit('should verify specific SSL Name with user-role user.',
          function (done) {
            API.identity
              .authenticate(user)
              .then(function () {
                API.resources.sslNames
                  .getAll()
                  .then(function (response) {
                    var sslNames = response.body;
                    API.resources.sslNames
                      .verify(sslNames[0].id)
                      .getOne()
                      .expect(200)
                      .then(function (res) {
                        res.body.message.should.equal('Waiting for approval');
                        done();
                      })
                      .catch(done);
                  })
                  .catch(done);
              })
              .catch(done);
          });
      });
    });
  });
});
