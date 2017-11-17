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
var SSLNameDataProvider = require('./../../common/providers/data/sslNames');

describe('Smoke check', function () {
  this.timeout(config.get('api.request.maxTimeout'));

  // Shared variables
  var sslName;
  var accountId;

  // Retrieving information about specific user that later we will use for
  // our API requests.
  var user = config.get('api.users.revAdmin');

  before(function (done) {
    done();
      
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
              .getOne('5818c83150611e2c5be4e49c')
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

    xit('should return a success response when creating specific SSL name.',
      function (done) {
       //var account_id = SSLNameDataProvider.generateOne(accountId);
       var account_id = '55b6ff6a7957012304a49d04'
       // can't create sslName because it fails with generateOne function don't create account with sslName
        API.helpers
          .authenticateUser(user)
          .then(function () {
            API.resources.sslNames
              .createOne(account_id)
              .expect(200)
              .then(function (response) {
                API.resources.sslNames
                  .deleteOne(response.body.id)
                  .end(done);
              })
              .catch(done);
          })
          .catch(done);
      });

    xit('should return a success response when deleting a SSL Name.',
      function (done) {
        var ssl_name_id = '5a0327ee92bf45484157ef81';
        // it's created manually because createOne doesn't working properly
        API.helpers
          .authenticateUser(user)
          .then(function () {
            return API.helpers.sslNames.createOne();
           //createOne doesn't working
          })
          .then(function () {
            API.resources.sslNames
             .deleteOne(ssl_name_id)
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
              .approvers()
              .getAll()
              .expect(200)
              .end(done);
          })
          .catch(done);
      });

    it('should return a success response when getting (verify) specific SSL name.',
      function (done) {
        var ssl_name_id = '5818c83150611e2c5be4e49c';
        API.helpers
          .authenticateUser(user)
          .then(function () {
            return API.resources.sslNames.verify(ssl_name_id);
          })
          .then(function () {
            API.resources.sslNames
             .getOne() 
             .expect(200)
             .end(done);
          })
          .catch(done);
      });
   });
});
