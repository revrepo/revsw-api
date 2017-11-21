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

    it('should load SSL Names list with revAdmin role.',
      function (done) {
        API.helpers
          .authenticateUser(user)
          .then(function () {
            API.resources.sslNames
              .getAll()
              .expect(200)
              .then(function (res) {
                var sslNamesArray = res.body;
                sslNamesArray.length.should.equal(7);
                sslNamesArray[6].ssl_name.should.be.equal('wwww3.revsw.com');
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should load specific SSL Name with revAdmin role.',
      function (done) {
        API.helpers
          .authenticateUser(user)
          .then(function () {
            API.resources.sslNames
              .getOne('5818c83150611e2c5be4e49c')
              .expect(200)
              .then(function (res) {
                res.body.ssl_name.should.equal('asd-123.revsw.com');
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should create specific SSL Name with revAdmin role.',
      function (done) {
        var sslname = SSLNameDP.generateOne(accountId,'test1');
        API.helpers
          .authenticateUser(user)
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

    it('should delete specific SSL Name with revAdmin role.',
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
              .then(function(res) {
                res.body.message.should.equal('Successfully deleted the SSL name');
                done();   
              })
              .catch(done);
          })
          .catch(done);
      });


    it('should load specific SSL Name with Email Approvers and revAdmin role.',
      function (done) {
        API.helpers
          .authenticateUser(user)
          .then(function () {
            API.resources.sslNames
              .approvers()
              .getAll({ssl_name:'wwww3.revsw.com'})
              .expect(200)
              .then(function (res) {
                var approversArray = res.body;
                approversArray.length.should.equal(11);
                approversArray[10].approver_email.should.be.equal('webmaster@revsw.com'); 
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should load specific SSL Name with revAdmin role.',
      function (done) {
        var ssl_name_id = '5818c83150611e2c5be4e49c';
        API.helpers
          .authenticateUser(user)
          .then(function () {
            return API.resources.sslNames.verify(ssl_name_id);
          })
          .then(function () {
            API.resources.sslNames
              .getOne(ssl_name_id) 
              .expect(200)
              .then(function (res) {
                res.body.ssl_name.should.equal('asd-123.revsw.com');
                done();
              })
              .catch(done);
          })
          .catch(done);
      });
  });
});
