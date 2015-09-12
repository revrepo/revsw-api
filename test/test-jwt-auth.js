process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
var should = require('should-http');
var request = require('supertest');
var agent = require('supertest-as-promised');

var express = require('express');
var fs = require('fs');
var https = require('https');
var sleep = require('sleep');
var utils = require('../lib/utilities.js');
var config = require('config');

var testAPIUrl = ( process.env.API_QA_URL ) ? process.env.API_QA_URL : 'https://localhost:' + config.get('service.https_port');
var testAPIUrlHTTP = ( process.env.API_QA_URL_HTTP ) ? process.env.API_QA_URL_HTTP : 'http://localhost:' + config.get('service.http_port');
var testAPIUrlExpected = ( process.env.API_QA_URL ) ? process.env.API_QA_URL : 'https://localhost:' + config.get('service.http_port');

var qaUserWithUserPerm = 'qa_user_with_user_perm@revsw.com',
  qaUserWithAdminPerm = 'api_qa_user_with_admin_perm@revsw.com',
  qaUserWithAdminPermPassword = 'password1',
  qaUserWithRevAdminPerm = 'qa_user_with_rev-admin_perm@revsw.com',
  qaUserWithResellerPerm = 'api_qa_user_with_reseller_perm@revsw.com',
  qaUserWithResellerPermPassword = 'password1',
  wrongUsername = 'wrong_username@revsw.com',
  wrongPassword = 'we5rsdfsdfs',
  testDomain = 'qa-api-test-domain.revsw.net';  // this domain should exist in the QA environment

describe('Rev API JWT Token', function() {

  var adminToken = '',
    userToken = ''.
    userCompanyId = '',
    testDomainId,
    testDomain = 'qa-api-test-domain.revsw.net',
    domainConfigJson = {};

    testUser = 'api-qa-user-' + Date.now() + '@revsw.com';
    testPass = 'password1';
    newTestPass = 'password2';

  var changePasswordJson = {
    current_password: testPass,
    new_password: newTestPass
  };

  var newUserJson = {
    'firstname': 'API QA User',
    'lastname': 'With User Perm',
    'email': testUser,
    'theme': 'light',
    'role': 'user',
    'password': testPass,
    'access_control_list': {
      'readOnly': false,
      'test': true,
      'configure': true,
      'reports': true,
      'dashBoard': true
    }
  };

  it('should create a new user account ' + testUser, function(done) {
    request(testAPIUrl)
      .post('/v1/users')
      .auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
      .send(newUserJson)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(200);
        response_json.message.should.be.equal('Successfully created new user');
        response_json.object_id.should.be.a.String();
        testUserId = response_json.object_id;
        done();
      });
  });

  it('should fail to authenticate using empty JSON', function(done) {
    request(testAPIUrl)
      .post('/v1/authenticate')
      .send( {} )
      .expect(400)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(400);
        response_json.error.should.be.equal('Bad Request');
        done();
      });
  });


  it('should fail to authenticate using wrong password', function(done) {
    request(testAPIUrl)
      .post('/v1/authenticate')
      .send( { email: testUser, password: 'edtq3tedfgsdfg' } )
      .expect(401)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(401);
        response_json.error.should.be.equal('Unauthorized');
        done();
      });
  });


  it('should authenticate and receive a token', function(done) {
    request(testAPIUrl)
      .post('/v1/authenticate')
      .send( { email: testUser, password: testPass } )
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(200);
        response_json.message.should.be.equal('Enjoy your token');
        response_json.token.should.be.a.String();
        userToken = response_json.token;
        done();
      });
  });

  it('should fail to get a list of countries without any authorization', function(done) {
    request(testAPIUrl)
      .get('/v1/countries/list')
      .expect(401)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        done();
      });
  });

  it('should fail to get a list of countries using wrong token', function(done) {
    request(testAPIUrl)
      .get('/v1/countries/list')
      .set('Authorization', 'Bearer asdljgadlskgjladgjsldkjglsdkjgldkfjgldfkgjdlfkgjdflkgjdlfgjdl')
      .expect(400)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        done();
      });
  });



  it('should get a list of countries using the new token', function(done) {
    request(testAPIUrl)
      .get('/v1/countries/list')
      .set('Authorization', 'Bearer ' + userToken)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        done();
      });
  });

  it('should successfully change the user password', function(done) {
    var changePasswordJson = {
      current_password: testPass,
      new_password: newTestPass
    };
    request(testAPIUrl)
      .put('/v1/users/password/' + testUserId)
      .auth(testUser, testPass)
      .send( changePasswordJson )
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(200);
        response_json.message.should.be.equal('Successfully updated the password');
        done();
      });
  });

  it('should fail to get a list of countries using the same token after password change', function(done) {
    request(testAPIUrl)
      .get('/v1/countries/list')
      .set('Authorization', 'Bearer ' + userToken)
      .expect(401)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        done();
      });
  });


  it('should delete test user account ' + testUser, function(done) {
    request(testAPIUrl)
      .delete('/v1/users/' + testUserId)
      .auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(200);
        response_json.message.should.be.equal('Successfully deleted the user');
        done();
      });
  });

});


