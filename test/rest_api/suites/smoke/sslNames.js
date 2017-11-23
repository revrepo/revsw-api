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
  var user = config.get('api.users.revAdmin');

  before(function (done) {
    API.helpers
      .authenticateUser(user)
      .then(function () {
        return API.helpers.sslNames.createOne();
      })
      .then(function (sslname) {
        sslName = sslname;
        accountId = sslName.account_id;
        done();
      })
      .catch(done);
  });

  after(function (done) {
    done();
  });

  describe('SSL Names resource', function () {

    it('should return a success response when getting all SSL Names.',
      function (done) {
        API.helpers
          .authenticateUser(user)
          .then(function () {
            API.resources.sslNames
              .getAll()
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

    it('should return a success response when getting specific SSL Name.',
      function (done) {
        API.helpers
          .authenticateUser(user)
          .then(function () {
            API.resources.sslNames
              .getAll()
              .then(function (response){
                API.resources.sslNames
                  .getOne(response.body[0].id)
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should return a success response when creating specific SSL name.',
      function (done) {
        var sslname = SSLNameDP.generateOne(accountId,'test');
        API.helpers
          .authenticateUser(user)
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

    it('should return a success response when deleting a specific SSL Name.',
      function (done) {
        var sslname = SSLNameDP.generateOne(accountId,'test2');
        API.helpers
          .authenticateUser(user)
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

    it('should return a success response when getting specific SSL Name with Email Approvers.',
      function (done) {
        API.helpers
          .authenticateUser(user)
          .then(function () {
            API.resources.sslNames
              .getAll()
              .then(function (response){  
                API.resources.sslNames
                  .approvers()
                  .getAll({ssl_name: response.body[0].ssl_name})
                  .expect(200)
                  .end(done);
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should return a success response when getting (verify) specific SSL name.',
      function (done) {
        API.helpers
          .authenticateUser(user)
          .then(function () {
            API.resources.sslNames
              .getAll()
              .then(function (response){
                API.resources.sslNames
                  .verify(response.body[5].id)
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
